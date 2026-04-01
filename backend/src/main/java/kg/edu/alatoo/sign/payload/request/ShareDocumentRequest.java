package kg.edu.alatoo.sign.payload.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import kg.edu.alatoo.sign.entity.PermissionLevel;
import lombok.Data;

@Data
public class ShareDocumentRequest {
    @NotNull
    @Email
    private String email;

    @NotNull
    private PermissionLevel permissionLevel;
}
