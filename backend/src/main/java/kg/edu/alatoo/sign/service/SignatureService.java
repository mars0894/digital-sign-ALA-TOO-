package kg.edu.alatoo.sign.service;

import kg.edu.alatoo.sign.entity.*;
import kg.edu.alatoo.sign.payload.request.SignRequest;
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
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import kg.edu.alatoo.sign.repository.DocumentCollaboratorRepository;

@Slf4j
@Service
@RequiredArgsConstructor
public class SignatureService {

    private final SignatureRepository signatureRepository;
    private final DocumentRepository documentRepository;
    private final StorageService storageService;
    private final AuditService auditService;
    private final DocumentCollaboratorRepository documentCollaboratorRepository;

    @Transactional
    public List<Signature> signDocument(UUID documentId, List<SignRequest.SignatureElement> elements, User user) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        if (!document.getOwner().getId().equals(user.getId())) {
             documentCollaboratorRepository.findByDocumentIdAndUserId(documentId, user.getId())
                .orElseThrow(() -> new RuntimeException("Access denied."));
        }

        if (document.getStatus() == DocumentStatus.SIGNED) {
            throw new IllegalStateException("Document is already signed");
        }

        List<Signature> savedSignatures = new ArrayList<>();

        if (elements != null && !elements.isEmpty()) {
            boolean pdModified = false;
            try {
                byte[] pdfBytes = storageService.getFile(document.getOriginalFileKey());
                try (PDDocument pdDoc = org.apache.pdfbox.Loader.loadPDF(pdfBytes)) {
                    
                    for (SignRequest.SignatureElement el : elements) {
                        String signatureData = el.getSignatureData();
                        Integer pageNumber = el.getPageNumber();
                        Float x = el.getX();
                        Float y = el.getY();
                        Float boxWidth = el.getBoxWidth();
                        Float boxHeight = el.getBoxHeight();
                        String type = el.getType() != null ? el.getType() : "SIGNATURE";
                        String colorStr = el.getColor() != null ? el.getColor() : "#000000";
                        Integer fontSize = el.getFontSize() != null ? el.getFontSize() : 16;

                        // 1. Physically stamp the PDF if coordinates are provided
                        if (pageNumber != null && x != null && y != null) {
                            pdModified = true;
                            PDPage page = pdDoc.getPage(pageNumber - 1); // 0-indexed in PDFBox
                            
                            if ("IMAGE".equals(type) || "STAMP".equals(type) || "SIGNATURE".equals(type) && signatureData.startsWith("data:image/")) {
                                String cleanB64 = signatureData.substring(signatureData.indexOf(",") + 1);
                                byte[] imageBytes = Base64.getDecoder().decode(cleanB64);
                                PDImageXObject pdImage = PDImageXObject.createFromByteArray(pdDoc, imageBytes, "signature");
                                
                                try (PDPageContentStream contentStream = new PDPageContentStream(pdDoc, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
                                    float drawWidth = boxWidth != null ? boxWidth : pdImage.getWidth() * 0.5f;
                                    float drawHeight = boxHeight != null ? boxHeight : pdImage.getHeight() * 0.5f;
                                    float actualY = page.getMediaBox().getHeight() - (y + drawHeight);
                                    contentStream.drawImage(pdImage, x, actualY, drawWidth, drawHeight);
                                }
                            } else {
                                // Text/Date annotations or fallback
                                try (PDPageContentStream contentStream = new PDPageContentStream(pdDoc, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
                                    contentStream.beginText();
                                    
                                    // Set dynamic vector styling
                                    String fontNameReq = el.getFontName() != null ? el.getFontName().toUpperCase() : "HELVETICA_BOLD_OBLIQUE";
                                    
                                    java.awt.Color fontColor;
                                    try {
                                        fontColor = java.awt.Color.decode(colorStr);
                                    } catch (Exception e) {
                                        fontColor = java.awt.Color.BLACK;
                                    }

                                    contentStream.setNonStrokingColor(fontColor);

                                    // Select standard PDF box font enum
                                    Standard14Fonts.FontName selectedFont;
                                    try {
                                        selectedFont = Standard14Fonts.FontName.valueOf(fontNameReq);
                                    } catch (IllegalArgumentException e) {
                                        selectedFont = Standard14Fonts.FontName.HELVETICA_BOLD_OBLIQUE;
                                    }
                                    
                                    contentStream.setFont(new PDType1Font(selectedFont), fontSize);
                                    
                                    float drawHeight = boxHeight != null ? boxHeight : fontSize;
                                    float actualY = page.getMediaBox().getHeight() - (y + drawHeight);
                                    contentStream.newLineAtOffset(x, actualY);
                                    contentStream.showText(signatureData);
                                    contentStream.endText();
                                }
                            }
                        }

                        // 2. Save metadata to DB for each element
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

                        savedSignatures.add(signatureRepository.save(signature));
                    }
                    
                    if (pdModified) {
                        ByteArrayOutputStream out = new ByteArrayOutputStream();
                        pdDoc.save(out);
                        storageService.uploadFile(document.getOriginalFileKey(), out.toByteArray(), "application/pdf");
                    }
                }
            } catch (IOException e) {
                log.error("Failed to apply signature to PDF physically", e);
                throw new RuntimeException("Failed to apply signature to document: " + e.getMessage());
            }
        }

        document.setStatus(DocumentStatus.SIGNED);
        documentRepository.save(document);

        auditService.log(user.getEmail(), "SIGN", document.getId().toString(), true, 
            "Document signed with " + savedSignatures.size() + " elements by " + user.getEmail());

        log.info("Document {} signed by user {} with {} elements", documentId, user.getEmail(), savedSignatures.size());
        return savedSignatures;
    }
}
