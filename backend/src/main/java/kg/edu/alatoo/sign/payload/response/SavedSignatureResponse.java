package kg.edu.alatoo.sign.payload.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class SavedSignatureResponse {
    private UUID id;
    private String label;
    private String imageData;
    private LocalDateTime createdAt;
}
