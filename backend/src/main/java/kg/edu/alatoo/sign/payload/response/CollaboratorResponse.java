package kg.edu.alatoo.sign.payload.response;

import kg.edu.alatoo.sign.entity.PermissionLevel;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class CollaboratorResponse {
    private UUID id;
    private String email;
    private String fullName;
    private PermissionLevel permissionLevel;
    private String addedAt;
}
