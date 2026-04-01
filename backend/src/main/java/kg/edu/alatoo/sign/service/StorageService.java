package kg.edu.alatoo.sign.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import org.apache.tika.Tika;
import java.util.Arrays;
import java.util.List;

@Slf4j
@Service
public class StorageService {

    private final String storageDir = "local_storage";
    private final Tika tika = new Tika();
    private final List<String> allowedMimeTypes = Arrays.asList(
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "image/jpeg",
        "image/png"
    );

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
        String detectedType = tika.detect(data);
        log.info("Detected MIME type: {}", detectedType);

        if (!allowedMimeTypes.contains(detectedType)) {
            log.error("Security alert: Attempted upload of forbidden file type: {}", detectedType);
            throw new RuntimeException("Invalid file type detected. Only PDF, Office documents, and images are allowed.");
        }

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
        if (key == null || key.contains("..") || key.startsWith("/") || key.startsWith("\\")) {
             throw new IllegalArgumentException("Invalid storage key provided.");
        }
        try {
            Path filePath = Paths.get(storageDir, key).normalize();
            if (!filePath.startsWith(Paths.get(storageDir).normalize())) {
                throw new IllegalArgumentException("Path traversal attempt detected!");
            }
            return Files.readAllBytes(filePath);
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
