package kg.edu.alatoo.sign.service;

import kg.edu.alatoo.sign.entity.AuditLog;
import kg.edu.alatoo.sign.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Transactional
    public void log(String username, String action, String targetId, boolean success, String details) {
        AuditLog log = AuditLog.builder()
                .username(username)
                .action(action)
                .targetId(targetId)
                .success(success)
                .details(details)
                .build();
        auditLogRepository.save(log);
    }
}
