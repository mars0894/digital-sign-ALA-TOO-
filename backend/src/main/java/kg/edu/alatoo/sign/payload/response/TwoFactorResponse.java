package kg.edu.alatoo.sign.payload.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class TwoFactorResponse {
    private String message;
    private String preAuthToken;
}
