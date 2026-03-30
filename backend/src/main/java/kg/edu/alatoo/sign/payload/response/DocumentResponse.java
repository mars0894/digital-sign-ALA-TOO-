package kg.edu.alatoo.sign.payload.response;

import kg.edu.alatoo.sign.entity.DocumentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentResponse {

    private UUID id;
    private String title;
    private DocumentStatus status;
    private LocalDateTime createdAt;
    private String downloadUrl; // presigned URL, may be null in list responses
    private String ownerEmail;
    private String ownerName;
    private LocalDateTime signedAt;
}
