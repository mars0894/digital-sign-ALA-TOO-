package kg.edu.alatoo.sign.service;

import kg.edu.alatoo.sign.entity.SavedSignature;
import kg.edu.alatoo.sign.entity.User;
import kg.edu.alatoo.sign.payload.request.SavedSignatureRequest;
import kg.edu.alatoo.sign.payload.response.SavedSignatureResponse;
import kg.edu.alatoo.sign.repository.SavedSignatureRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SavedSignatureService {
    private final SavedSignatureRepository repository;

    public SavedSignatureResponse saveSignature(User user, SavedSignatureRequest request) {
        SavedSignature sig = SavedSignature.builder()
                .user(user)
                .label(request.getLabel())
                .imageData(request.getImageData())
                .build();
        sig = repository.save(sig);
        return mapToResponse(sig);
    }

    public List<SavedSignatureResponse> getUserSignatures(User user) {
        return repository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream().map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public void deleteSignature(User user, UUID id) {
        SavedSignature sig = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Saved signature not found"));
        if (!sig.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        repository.delete(sig);
    }

    private SavedSignatureResponse mapToResponse(SavedSignature sig) {
        return SavedSignatureResponse.builder()
                .id(sig.getId())
                .label(sig.getLabel())
                .imageData(sig.getImageData())
                .createdAt(sig.getCreatedAt())
                .build();
    }
}
