package kg.edu.alatoo.sign.service;

import kg.edu.alatoo.sign.entity.*;
import kg.edu.alatoo.sign.repository.AuditLogRepository;
import kg.edu.alatoo.sign.repository.DocumentRepository;
import kg.edu.alatoo.sign.repository.SignatureRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SignatureService {

    private final SignatureRepository signatureRepository;
    private final DocumentRepository documentRepository;
    private final AuditLogRepository auditLogRepository;
    private final StorageService storageService; // Added to load/save PDFs

    @Transactional
    public Signature signDocument(UUID documentId, String signatureData, Integer pageNumber, Float x, Float y, Float boxWidth, Float boxHeight, User user) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        if (document.getStatus() == DocumentStatus.SIGNED) {
            throw new IllegalStateException("Document is already signed");
        }

        // 1. Physically stamp the PDF if coordinates are provided
        if (pageNumber != null && x != null && y != null) {
            try {
                byte[] pdfBytes = storageService.getFile(document.getOriginalFileKey());
                try (PDDocument pdDoc = org.apache.pdfbox.Loader.loadPDF(pdfBytes)) {
                    PDPage page = pdDoc.getPage(pageNumber - 1); // 0-indexed in PDFBox
                    // Check if signature is a Data URI image or text
                    if (signatureData.startsWith("data:image/png;base64,")) {
                        String b64Image = signatureData.substring("data:image/png;base64,".length());
                        byte[] imageBytes = Base64.getDecoder().decode(b64Image);
                        PDImageXObject pdImage = PDImageXObject.createFromByteArray(pdDoc, imageBytes, "signature");
                        
                        try (PDPageContentStream contentStream = new PDPageContentStream(pdDoc, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
                            // If dimensions are provided, scale precisely to the box
                            float drawWidth = boxWidth != null ? boxWidth : pdImage.getWidth() * 0.5f;
                            float drawHeight = boxHeight != null ? boxHeight : pdImage.getHeight() * 0.5f;
                            // PDF y-axis is bottom-up. actualY is the bottom edge of the image.
                            float actualY = page.getMediaBox().getHeight() - (y + drawHeight);
                            contentStream.drawImage(pdImage, x, actualY, drawWidth, drawHeight);
                        }
                    } else {
                        // Text signature
                        try (PDPageContentStream contentStream = new PDPageContentStream(pdDoc, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
                            contentStream.beginText();
                            contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD_OBLIQUE), 16);
                            // PDF y-axis is bottom-up, actualY is the exact bottom baseline of the text.
                            // Assuming typical height for a 16pt string is ~16 points. 
                            float drawHeight = boxHeight != null ? boxHeight : 16f;
                            float actualY = page.getMediaBox().getHeight() - (y + drawHeight);
                            contentStream.newLineAtOffset(x, actualY);
                            contentStream.showText(signatureData);
                            contentStream.endText();
                        }
                    }
                    
                    ByteArrayOutputStream out = new ByteArrayOutputStream();
                    pdDoc.save(out);
                    // Overwrite the file in storage
                    storageService.uploadFile(document.getOriginalFileKey(), out.toByteArray(), "application/pdf");
                }
            } catch (IOException e) {
                log.error("Failed to apply signature to PDF physically", e);
                throw new RuntimeException("Failed to apply signature to document: " + e.getMessage());
            }
        }

        // 2. Save metadata to DB
        Signature signature = Signature.builder()
                .document(document)
                .signer(user)
                .signatureData(signatureData)
                .pageNumber(pageNumber)
                .coordinateX(x)
                .coordinateY(y)
                .boxWidth(boxWidth)
                .boxHeight(boxHeight)
                .timestamp(LocalDateTime.now())
                .build();

        signature = signatureRepository.save(signature);

        document.setStatus(DocumentStatus.SIGNED);
        documentRepository.save(document);

        AuditLog auditLog = AuditLog.builder()
                .entityName("Document")
                .entityId(document.getId())
                .action("SIGN")
                .performedBy(user)
                .details("Document signed by " + user.getEmail() + (pageNumber != null ? (" on page " + pageNumber) : ""))
                .build();
        auditLogRepository.save(auditLog);

        log.info("Document {} signed by user {}", documentId, user.getEmail());
        return signature;
    }
}
