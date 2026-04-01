package kg.edu.alatoo.sign.service;

import kg.edu.alatoo.sign.entity.Document;
import kg.edu.alatoo.sign.entity.DocumentStatus;
import kg.edu.alatoo.sign.entity.User;
import kg.edu.alatoo.sign.payload.response.DocumentResponse;
import kg.edu.alatoo.sign.entity.DocumentCollaborator;
import kg.edu.alatoo.sign.payload.request.ShareDocumentRequest;
import kg.edu.alatoo.sign.payload.response.CollaboratorResponse;
import kg.edu.alatoo.sign.repository.DocumentRepository;
import kg.edu.alatoo.sign.repository.SignatureRepository;
import kg.edu.alatoo.sign.repository.DocumentCollaboratorRepository;
import kg.edu.alatoo.sign.repository.UserRepository;
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
    private final SignatureRepository signatureRepository;
    private final StorageService storageService;
    private final DocumentConversionService documentConversionService;
    private final DocumentCollaboratorRepository documentCollaboratorRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final AuditService auditService;

    /**
     * Upload a PDF and persist the Document record.
     */
    @Transactional
    public DocumentResponse uploadDocument(MultipartFile file, String title, User owner) throws IOException {
        byte[] pdfData;
        try {
            pdfData = documentConversionService.convertToPdf(file);
        } catch (Exception e) {
            log.error("Failed to convert document", e);
            throw new IllegalArgumentException("Failed to process file format: " + e.getMessage());
        }

        String originalName = file.getOriginalFilename();
        String safeFileName = (originalName != null && !originalName.trim().isEmpty()) ? originalName : "document";
        if (safeFileName.contains(".")) {
            safeFileName = safeFileName.substring(0, safeFileName.lastIndexOf('.')) + ".pdf";
        } else {
            safeFileName += ".pdf";
        }

        String key = buildStorageKey(owner.getId(), safeFileName);
        storageService.uploadFile(key, pdfData, "application/pdf");

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
     * Converts a file to PDF without saving it to storage or creating a Document record.
     */
    @Transactional(readOnly = true)
    public byte[] convertToPdfOnly(MultipartFile file) throws IOException {
        try {
            return documentConversionService.convertToPdf(file);
        } catch (Exception e) {
            log.error("Failed to convert document", e);
            throw new IllegalArgumentException("Failed to process file format: " + e.getMessage());
        }
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
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found."));

        if (!document.getOwner().getId().equals(owner.getId())) {
            documentCollaboratorRepository.findByDocumentIdAndUserId(documentId, owner.getId())
                    .orElseThrow(() -> new RuntimeException("Access denied."));
        }

        String presignedUrl = storageService.generatePresignedUrl(document.getOriginalFileKey());
        return toResponse(document, presignedUrl);
    }

    /**
     * Get the file key for a document if the user is authorized.
     */
    @Transactional(readOnly = true)
    public String getAuthorizedFileKey(UUID documentId, User user) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found."));

        if (!document.getOwner().getId().equals(user.getId())) {
            documentCollaboratorRepository.findByDocumentIdAndUserId(documentId, user.getId())
                    .orElseThrow(() -> new RuntimeException("Access denied."));
        }

        return document.getOriginalFileKey();
    }

    /**
     * Download the physical PDF file
     */
    @Transactional(readOnly = true)
    public byte[] getFileData(String key) {
        // Validation is now handled via the temporary token in the controller
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

    @Transactional
    public void shareDocument(UUID documentId, ShareDocumentRequest request, User currentUser) {
        Document document = documentRepository.findByIdAndOwnerId(documentId, currentUser.getId())
                .orElseThrow(() -> new RuntimeException("Document not found or access denied."));
                
        User targetUser = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User with email " + request.getEmail() + " not found."));
                
        if (targetUser.getId().equals(currentUser.getId())) {
             throw new RuntimeException("Cannot share document with yourself.");
        }

        documentCollaboratorRepository.findByDocumentIdAndUserId(documentId, targetUser.getId())
            .ifPresentOrElse(
                collab -> {
                    collab.setPermissionLevel(request.getPermissionLevel());
                    documentCollaboratorRepository.save(collab);
                },
                () -> {
                    DocumentCollaborator collab = DocumentCollaborator.builder()
                        .document(document)
                        .user(targetUser)
                        .permissionLevel(request.getPermissionLevel())
                        .build();
                    documentCollaboratorRepository.save(collab);
                    
                    emailService.sendCollaborationInvite(targetUser.getEmail(), document.getTitle(), currentUser.getFirstName());
                    notificationService.createNotification(targetUser, 
                        "Document Shared", 
                        currentUser.getFirstName() + " shared '" + document.getTitle() + "' with you.");
                }
            );
            
        audit(document, "SHARE", currentUser, "Shared with " + targetUser.getEmail() + " as " + request.getPermissionLevel());
    }

    @Transactional(readOnly = true)
    public List<CollaboratorResponse> getCollaborators(UUID documentId, User currentUser) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found."));
                
        if (!document.getOwner().getId().equals(currentUser.getId())) {
             documentCollaboratorRepository.findByDocumentIdAndUserId(documentId, currentUser.getId())
                .orElseThrow(() -> new RuntimeException("Access denied."));
        }
        
        return documentCollaboratorRepository.findByDocumentId(documentId).stream()
                .map(c -> CollaboratorResponse.builder()
                        .id(c.getId())
                        .email(c.getUser().getEmail())
                        .fullName(c.getUser().getFirstName() + " " + c.getUser().getLastName())
                        .permissionLevel(c.getPermissionLevel())
                        .addedAt(c.getAddedAt() != null ? c.getAddedAt().toString() : "")
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> listSharedDocuments(User currentUser) {
        return documentCollaboratorRepository.findByUserId(currentUser.getId()).stream()
                .map(DocumentCollaborator::getDocument)
                .map(doc -> toResponse(doc, null))
                .collect(Collectors.toList());
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private String buildStorageKey(UUID userId, String originalFilename) {
        String sanitized = originalFilename != null
                ? originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_")
                : "document.pdf";
        return "documents/" + userId + "/" + UUID.randomUUID() + "_" + sanitized;
    }

    private void audit(Document document, String action, User actor, String details) {
        auditService.log(actor.getEmail(), action, document.getId().toString(), true, details);
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
