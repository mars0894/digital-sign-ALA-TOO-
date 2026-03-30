package kg.edu.alatoo.sign.payload.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SignRequest {
    @NotNull
    private UUID documentId;

    @NotNull
    private List<SignatureElement> elements;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SignatureElement {
        @NotBlank
        private String signatureData;
        private Integer pageNumber;
        private Float x;
        private Float y;
        private Float boxWidth;
        private Float boxHeight;
    }
}
