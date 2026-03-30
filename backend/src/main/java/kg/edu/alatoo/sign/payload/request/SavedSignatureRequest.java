package kg.edu.alatoo.sign.payload.request;

import lombok.Data;

@Data
public class SavedSignatureRequest {
    private String label;
    private String imageData;
}
