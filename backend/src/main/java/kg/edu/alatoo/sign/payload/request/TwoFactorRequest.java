package kg.edu.alatoo.sign.payload.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TwoFactorRequest {
    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String code;

    @NotBlank
    private String preAuthToken;
}
