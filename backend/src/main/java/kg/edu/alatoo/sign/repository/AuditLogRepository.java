package kg.edu.alatoo.sign.repository;

import kg.edu.alatoo.sign.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    List<AuditLog> findByEntityIdOrderByTimestampDesc(UUID entityId);

    List<AuditLog> findByPerformedByIdOrderByTimestampDesc(UUID userId);
}
