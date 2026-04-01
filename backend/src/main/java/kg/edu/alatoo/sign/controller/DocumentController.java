package kg.edu.alatoo.sign.controller;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.Valid;
import kg.edu.alatoo.sign.entity.User;
import kg.edu.alatoo.sign.payload.request.ShareDocumentRequest;
import kg.edu.alatoo.sign.payload.response.CollaboratorResponse;
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
public class DocumentController {

    private final DocumentService documentService;
    private final kg.edu.alatoo.sign.service.SecureDownloadTokenService secureDownloadTokenService;

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
     * POST /api/v1/documents/{id}/download-token
     * Generate a temporary download token for a document.
     */
    @PostMapping("/{id}/download-token")
    public ResponseEntity<Map<String, String>> getDownloadToken(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser) {

        DocumentResponse doc = documentService.getDocument(id, currentUser);
        // The getDocument call above already performs ownership/collaborator checks.
        // We'll need a way to get the original file key from the service if it's not in the response.
        // For now, assume we can get it or we refactor getDocument.
        
        // Let's use a new method in service that returns the key for an authorized user.
        String fileKey = documentService.getAuthorizedFileKey(id, currentUser);
        String token = secureDownloadTokenService.generateDownloadToken(fileKey, currentUser.getEmail());
        
        return ResponseEntity.ok(Map.of("token", token));
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
     * GET /api/v1/documents/shared
     * List all documents shared with the authenticated user.
     */
    @GetMapping("/shared")
    public ResponseEntity<List<DocumentResponse>> listSharedDocuments(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(documentService.listSharedDocuments(currentUser));
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
     * POST /api/v1/documents/{id}/collaborators
     * Add or update a collaborator for a document.
     */
    @PostMapping("/{id}/collaborators")
    public ResponseEntity<MessageResponse> shareDocument(
            @PathVariable UUID id,
            @Valid @RequestBody ShareDocumentRequest request,
            @AuthenticationPrincipal User currentUser) {

        documentService.shareDocument(id, request, currentUser);
        return ResponseEntity.ok(new MessageResponse("Document shared successfully."));
    }

    /**
     * GET /api/v1/documents/{id}/collaborators
     * Get all collaborators for a document.
     */
    @GetMapping("/{id}/collaborators")
    public ResponseEntity<List<CollaboratorResponse>> getCollaborators(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser) {

        return ResponseEntity.ok(documentService.getCollaborators(id, currentUser));
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
     * GET /api/v1/documents/download
     * Secure download using a temporary token.
     */
    @GetMapping("/download")
    public ResponseEntity<byte[]> downloadDocument(@RequestParam("token") String token) {
        String fileKey = secureDownloadTokenService.validateTokenAndGetFileKey(token);
        byte[] file = documentService.getFileData(fileKey);
        
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("inline", "document.pdf");
        
        return ResponseEntity.ok()
                .headers(headers)
                .body(file);
    }
}
