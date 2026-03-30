package kg.edu.alatoo.sign.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;

@Slf4j
@Service
public class StorageService {

    @PostConstruct
    public void init() {
        log.warn("StorageService is in STUB mode due to persistent network issues downloading AWS SDK.");
    }

    public String uploadFile(String key, byte[] data, String contentType) {
        log.info("[STUB] Simulated upload to key: {}", key);
        return key;
    }

    public String generatePresignedUrl(String key) {
        log.info("[STUB] Simulated presigned URL for key: {}", key);
        return "http://localhost:8080/api/v1/documents/download/" + key;
    }

    public void deleteFile(String key) {
        log.info("[STUB] Simulated delete of key: {}", key);
    }
}
