package kg.edu.alatoo.sign.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class EmailService {
    public void sendCollaborationInvite(String toEmail, String documentTitle, String inviterName) {
        log.info("📧 Mock sending email to {}: {} has invited you to collaborate on document: '{}'", 
                toEmail, inviterName, documentTitle);
    }
}
