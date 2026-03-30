package kg.edu.alatoo.sign.payload.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SignRequest {
    @NotNull
    private UUID documentId;

    @NotBlank
    private String signatureData;
    
    // Optional coordinates for visual placement
    private Integer pageNumber;
    private Float x;
    private Float y;
    
    // Optional dimensions for visual signature box
    private Float boxWidth;
    private Float boxHeight;
}
