package kg.edu.alatoo.sign.service;

import kg.edu.alatoo.sign.entity.AuditLog;
import kg.edu.alatoo.sign.entity.Document;
import kg.edu.alatoo.sign.entity.DocumentStatus;
import kg.edu.alatoo.sign.entity.User;
import kg.edu.alatoo.sign.payload.response.DocumentResponse;
import kg.edu.alatoo.sign.repository.AuditLogRepository;
import kg.edu.alatoo.sign.repository.DocumentRepository;
import kg.edu.alatoo.sign.repository.SignatureRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final AuditLogRepository auditLogRepository;
    private final SignatureRepository signatureRepository;
    private final StorageService storageService;

    /**
     * Upload a PDF and persist the Document record.
     */
    @Transactional
    public DocumentResponse uploadDocument(MultipartFile file, String title, User owner) throws IOException {
        if (!isPdf(file)) {
            throw new IllegalArgumentException("Only PDF files are accepted.");
        }

        String key = buildStorageKey(owner.getId(), file.getOriginalFilename());
        storageService.uploadFile(key, file.getBytes(), "application/pdf");

        Document document = Document.builder()
                .owner(owner)
                .title(title)
                .originalFileKey(key)
                .status(DocumentStatus.PENDING_SIGNATURE)
                .build();

        document = documentRepository.save(document);

        audit(document, "UPLOAD", owner,
                "Uploaded PDF: " + file.getOriginalFilename() + " (" + file.getSize() + " bytes)");

        return toResponse(document, null);
    }

    /**
     * List all documents owned by the given user (no presigned URLs for performance).
     */
    @Transactional(readOnly = true)
    public List<DocumentResponse> listDocuments(User owner) {
        return documentRepository.findByOwnerIdOrderByCreatedAtDesc(owner.getId())
                .stream()
                .map(doc -> toResponse(doc, null))
                .collect(Collectors.toList());
    }

    /**
     * Get a single document with a fresh presigned download URL.
     */
    @Transactional(readOnly = true)
    public DocumentResponse getDocument(UUID documentId, User owner) {
        Document document = documentRepository.findByIdAndOwnerId(documentId, owner.getId())
                .orElseThrow(() -> new RuntimeException("Document not found or access denied."));

        String presignedUrl = storageService.generatePresignedUrl(document.getOriginalFileKey());
        return toResponse(document, presignedUrl);
    }

    /**
     * Download the physical PDF file
     */
    @Transactional(readOnly = true)
    public byte[] getFileData(String key) {
        // Simple security can be added here if needed, but the keys are UUID based
        return storageService.getFile(key);
    }

    /**
     * Soft-delete: move document to REJECTED status (preserves audit trail).
     */
    @Transactional
    public void deleteDocument(UUID documentId, User owner) {
        Document document = documentRepository.findByIdAndOwnerId(documentId, owner.getId())
                .orElseThrow(() -> new RuntimeException("Document not found or access denied."));

        document.setStatus(DocumentStatus.REJECTED);
        documentRepository.save(document);

        audit(document, "DELETE", owner, "Document soft-deleted (status set to REJECTED)");
    }

    /**
     * Dashboard stats for the current user.
     */
    @Transactional(readOnly = true)
    public Map<String, Long> getStats(User owner) {
        UUID uid = owner.getId();
        return Map.of(
                "total", documentRepository.countByOwnerId(uid),
                "pending", documentRepository.countByOwnerIdAndStatus(uid, DocumentStatus.PENDING_SIGNATURE),
                "signed", documentRepository.countByOwnerIdAndStatus(uid, DocumentStatus.SIGNED),
                "draft", documentRepository.countByOwnerIdAndStatus(uid, DocumentStatus.DRAFT)
        );
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private boolean isPdf(MultipartFile file) {
        String contentType = file.getContentType();
        String name = file.getOriginalFilename();
        return "application/pdf".equalsIgnoreCase(contentType)
                || (name != null && name.toLowerCase().endsWith(".pdf"));
    }

    private String buildStorageKey(UUID userId, String originalFilename) {
        String sanitized = originalFilename != null
                ? originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_")
                : "document.pdf";
        return "documents/" + userId + "/" + UUID.randomUUID() + "_" + sanitized;
    }

    private void audit(Document document, String action, User actor, String details) {
        AuditLog log = AuditLog.builder()
                .entityName("Document")
                .entityId(document.getId())
                .action(action)
                .performedBy(actor)
                .details(details)
                .build();
        auditLogRepository.save(log);
    }

    private DocumentResponse toResponse(Document doc, String presignedUrl) {
        return DocumentResponse.builder()
                .id(doc.getId())
                .title(doc.getTitle())
                .status(doc.getStatus())
                .createdAt(doc.getCreatedAt())
                .downloadUrl(presignedUrl)
                .ownerEmail(doc.getOwner().getEmail())
                .ownerName(doc.getOwner().getFirstName() + " " + doc.getOwner().getLastName())
                .signedAt(doc.getStatus() == DocumentStatus.SIGNED 
                    ? signatureRepository.findByDocumentId(doc.getId()).stream()
                        .map(kg.edu.alatoo.sign.entity.Signature::getTimestamp)
                        .findFirst().orElse(null) 
                    : null)
                .build();
    }
}
