package kg.edu.alatoo.sign.controller;

import kg.edu.alatoo.sign.entity.User;
import kg.edu.alatoo.sign.payload.request.SavedSignatureRequest;
import kg.edu.alatoo.sign.payload.response.SavedSignatureResponse;
import kg.edu.alatoo.sign.service.SavedSignatureService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/saved-signatures")
@RequiredArgsConstructor
public class SavedSignatureController {

    private final SavedSignatureService service;

    @GetMapping
    public ResponseEntity<List<SavedSignatureResponse>> getMySignatures(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(service.getUserSignatures(currentUser));
    }

    @PostMapping
    public ResponseEntity<SavedSignatureResponse> addSignature(@AuthenticationPrincipal User currentUser, @RequestBody SavedSignatureRequest request) {
        return ResponseEntity.ok(service.saveSignature(currentUser, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSignature(@AuthenticationPrincipal User currentUser, @PathVariable UUID id) {
        service.deleteSignature(currentUser, id);
        return ResponseEntity.noContent().build();
    }
}
