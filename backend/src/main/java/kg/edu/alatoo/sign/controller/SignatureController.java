package kg.edu.alatoo.sign.controller;

import jakarta.validation.Valid;
import kg.edu.alatoo.sign.entity.User;
import kg.edu.alatoo.sign.payload.request.SignRequest;
import kg.edu.alatoo.sign.payload.response.MessageResponse;
import kg.edu.alatoo.sign.service.SignatureService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/signatures")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", maxAge = 3600)
public class SignatureController {

    private final SignatureService signatureService;

    @PostMapping
    public ResponseEntity<MessageResponse> signDocument(
            @Valid @RequestBody SignRequest signRequest,
            @AuthenticationPrincipal User currentUser) {

        signatureService.signDocument(
                signRequest.getDocumentId(),
                signRequest.getSignatureData(),
                signRequest.getPageNumber(),
                signRequest.getX(),
                signRequest.getY(),
                signRequest.getBoxWidth(),
                signRequest.getBoxHeight(),
                currentUser
        );

        return ResponseEntity.ok(new MessageResponse("Document signed successfully."));
    }
}
