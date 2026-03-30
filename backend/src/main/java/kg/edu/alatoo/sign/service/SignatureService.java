package kg.edu.alatoo.sign.service;

import kg.edu.alatoo.sign.entity.*;
import kg.edu.alatoo.sign.repository.AuditLogRepository;
import kg.edu.alatoo.sign.repository.DocumentRepository;
import kg.edu.alatoo.sign.repository.SignatureRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SignatureService {

    private final SignatureRepository signatureRepository;
    private final DocumentRepository documentRepository;
    private final AuditLogRepository auditLogRepository;

    /**
     * Signs a document for the current user.
     * In this simple version, it creates a Signature record and updates document status.
     * Future versions may perform PDF modification for PAdES.
     */
    @Transactional
    public Signature signDocument(UUID documentId, String signatureData, User user) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        if (document.getStatus() == DocumentStatus.SIGNED) {
            throw new IllegalStateException("Document is already signed");
        }

        Signature signature = Signature.builder()
                .document(document)
                .signer(user)
                .signatureData(signatureData)
                .timestamp(LocalDateTime.now())
                .build();

        signature = signatureRepository.save(signature);

        // Update document status
        document.setStatus(DocumentStatus.SIGNED);
        documentRepository.save(document);

        // Audit the event
        AuditLog auditLog = AuditLog.builder()
                .entityName("Document")
                .entityId(document.getId())
                .action("SIGN")
                .performedBy(user)
                .details("Document signed by " + user.getEmail())
                .build();
        auditLogRepository.save(auditLog);

        log.info("Document {} signed by user {}", documentId, user.getEmail());
        return signature;
    }
}
