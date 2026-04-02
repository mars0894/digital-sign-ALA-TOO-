package kg.edu.alatoo.sign.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;

@Slf4j
@Service
public class StorageService {

    private final String storageDir = "local_storage";

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(Paths.get(storageDir));
            log.info("Initialized local storage at {}", storageDir);
        } catch (IOException e) {
            log.error("Could not create storage directory", e);
        }
    }

    public String uploadFile(String key, byte[] data, String contentType) {
        try {
            Path filePath = Paths.get(storageDir, key);
            Files.createDirectories(filePath.getParent());
            Files.write(filePath, data, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            log.info("Uploaded file locally to key: {}", key);
        } catch (IOException e) {
            log.error("Failed to upload file locally", e);
            throw new RuntimeException("Failed to upload file");
        }
        return key;
    }

    public byte[] getFile(String key) {
        try {
            return Files.readAllBytes(Paths.get(storageDir, key));
        } catch (IOException e) {
            throw new RuntimeException("File not found");
        }
    }

    public String generatePresignedUrl(String key) {
        return "http://localhost:8081/api/v1/documents/download/" + key;
    }

    public void deleteFile(String key) {
        try {
            Files.deleteIfExists(Paths.get(storageDir, key));
            log.info("Deleted local file key: {}", key);
        } catch (IOException e) {
            log.error("Failed to delete local file", e);
        }
    }
}
