package kg.edu.alatoo.sign.controller;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import kg.edu.alatoo.sign.entity.User;
import kg.edu.alatoo.sign.payload.response.DocumentResponse;
import kg.edu.alatoo.sign.payload.response.MessageResponse;
import kg.edu.alatoo.sign.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", maxAge = 3600)
public class DocumentController {

    private final DocumentService documentService;

    /**
     * POST /api/v1/documents
     * Upload a new PDF document.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentResponse> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") @NotBlank @Size(max = 255) String title,
            @AuthenticationPrincipal User currentUser) throws IOException {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        DocumentResponse response = documentService.uploadDocument(file, title, currentUser);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/v1/documents/convert-only
     * Convert any file to PDF without saving it to storage. Used for tools like Extractor.
     */
    @PostMapping(value = "/convert-only", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<byte[]> convertOnly(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User currentUser) throws IOException {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        byte[] pdfData = documentService.convertToPdfOnly(file);
        
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("inline", "converted.pdf");
        
        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfData);
    }

    /**
     * GET /api/v1/documents
     * List all documents owned by the authenticated user.
     */
    @GetMapping
    public ResponseEntity<List<DocumentResponse>> listDocuments(
            @AuthenticationPrincipal User currentUser) {

        return ResponseEntity.ok(documentService.listDocuments(currentUser));
    }

    /**
     * GET /api/v1/documents/stats
     * Dashboard stats for the current user.
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getStats(
            @AuthenticationPrincipal User currentUser) {

        return ResponseEntity.ok(documentService.getStats(currentUser));
    }

    /**
     * GET /api/v1/documents/{id}
     * Get a single document with a presigned download URL.
     */
    @GetMapping("/{id}")
    public ResponseEntity<DocumentResponse> getDocument(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser) {

        DocumentResponse response = documentService.getDocument(id, currentUser);
        return ResponseEntity.ok(response);
    }

    /**
     * DELETE /api/v1/documents/{id}
     * Soft-delete a document (status → REJECTED).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> deleteDocument(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser) {

        documentService.deleteDocument(id, currentUser);
        return ResponseEntity.ok(new MessageResponse("Document deleted successfully."));
    }

    /**
     * GET /api/v1/documents/download/**
     */
    @GetMapping("/download/**")
    public ResponseEntity<byte[]> downloadDocument(jakarta.servlet.http.HttpServletRequest request) {
        String path = request.getRequestURI().split(request.getContextPath() + "/api/v1/documents/download/")[1];
        byte[] file = documentService.getFileData(path);
        
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        // Display inline instead of attachment to let browser render it
        headers.setContentDispositionFormData("inline", "document.pdf");
        
        return ResponseEntity.ok()
                .headers(headers)
                .body(file);
    }
}
