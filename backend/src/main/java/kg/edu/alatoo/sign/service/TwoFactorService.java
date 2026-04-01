package kg.edu.alatoo.sign.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class TwoFactorService {

    private final StringRedisTemplate redisTemplate;
    private final JavaMailSender mailSender;
    private static final String REDIS_PREFIX = "2FA_CODE:";
    private static final int CODE_LENGTH = 6;
    private static final long EXPIRATION_MINUTES = 5;

    public void sendVerificationCode(String email) {
        String code = generateCode();
        redisTemplate.opsForValue().set(REDIS_PREFIX + email, code, EXPIRATION_MINUTES, TimeUnit.MINUTES);
        
        sendEmail(email, code);
        log.info("2FA code sent to {}", email);
    }

    public boolean verifyCode(String email, String code) {
        String storedCode = redisTemplate.opsForValue().get(REDIS_PREFIX + email);
        if (storedCode != null && storedCode.equals(code)) {
            redisTemplate.delete(REDIS_PREFIX + email);
            return true;
        }
        return false;
    }

    private String generateCode() {
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(random.nextInt(10));
        }
        return sb.toString();
    }

    private void sendEmail(String to, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("no-reply@alatoo.edu.kg");
        message.setTo(to);
        message.setSubject("Your Ala-Too 2FA Verification Code");
        message.setText("Your verification code is: " + code + "\nValid for " + EXPIRATION_MINUTES + " minutes.");
        mailSender.send(message);
    }
}
