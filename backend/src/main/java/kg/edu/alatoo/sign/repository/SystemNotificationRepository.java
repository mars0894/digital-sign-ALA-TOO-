package kg.edu.alatoo.sign.repository;

import kg.edu.alatoo.sign.entity.SystemNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SystemNotificationRepository extends JpaRepository<SystemNotification, UUID> {
    
    List<SystemNotification> findByTargetUserIdOrderByCreatedAtDesc(UUID userId);
    
    List<SystemNotification> findByTargetUserIdAndReadFalseOrderByCreatedAtDesc(UUID userId);
}
