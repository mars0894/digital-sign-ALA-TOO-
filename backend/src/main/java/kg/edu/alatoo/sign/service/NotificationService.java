package kg.edu.alatoo.sign.service;

import kg.edu.alatoo.sign.entity.SystemNotification;
import kg.edu.alatoo.sign.entity.User;
import kg.edu.alatoo.sign.repository.SystemNotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {
    
    private final SystemNotificationRepository notificationRepository;

    @Transactional
    public void createNotification(User targetUser, String title, String message) {
        SystemNotification notification = SystemNotification.builder()
                .targetUser(targetUser)
                .title(title)
                .message(message)
                .build();
        notificationRepository.save(notification);
        log.info("🔔 Notification created for {}: {}", targetUser.getEmail(), title);
    }
}
