package kg.edu.alatoo.sign.payload.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
        @Size(max = 250000)
        private String signatureData;
        
        @NotNull
        private Integer pageNumber;
        
        private Float x;
        private Float y;
        private Float boxWidth;
        private Float boxHeight;
        
        // Customization explicit fields
        @Size(max = 20)
        private String type; // e.g., TEXT, IMAGE, DATE, STAMP
        
        @Size(max = 7)
        private String color; // hex color e.g. #000000
        
        private Integer fontSize; // size for text elements
        
        @Size(max = 50)
        private String fontName; // e.g., HELVETICA, COURIER, TIMES_ROMAN
    }
}
