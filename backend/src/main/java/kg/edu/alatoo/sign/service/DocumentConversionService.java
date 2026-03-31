package kg.edu.alatoo.sign.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class DocumentConversionService {

    @Value("${gotenberg.url:http://localhost:3000}")
    private String gotenbergUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public byte[] convertToPdf(MultipartFile file) throws IOException {
        String contentType = file.getContentType();
        if (contentType == null) {
            throw new IllegalArgumentException("Unknown file type");
        }

        // Если это уже PDF, ничего не делаем
        if (contentType.equals("application/pdf")) {
            return file.getBytes();
        }

        // Если это изображение, конвертируем локально через PDFBox (быстро и надежно)
        if (contentType.startsWith("image/")) {
            return convertImageToPdf(file);
        }

        // Если это Office/Text документ, используем Gotenberg API
        return convertViaGotenberg(file);
    }

    private byte[] convertImageToPdf(MultipartFile imageFile) throws IOException {
        PDDocument document = new PDDocument();
        try {
            PDImageXObject pdImage = PDImageXObject.createFromByteArray(document, imageFile.getBytes(), imageFile.getOriginalFilename());
            
            // Создаем страницу по размеру изображения
            PDRectangle rectangle = new PDRectangle(pdImage.getWidth(), pdImage.getHeight());
            PDPage page = new PDPage(rectangle);
            document.addPage(page);

            try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                contentStream.drawImage(pdImage, 0, 0, pdImage.getWidth(), pdImage.getHeight());
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            return baos.toByteArray();
        } finally {
            document.close();
        }
    }

    private byte[] convertViaGotenberg(MultipartFile file) throws IOException {
        String endpoint = gotenbergUrl + "/forms/libreoffice/convert";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        // Оборачиваем файл в Resource, чтобы RestTemplate правильно передал имя и содержимое
        ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                return file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.docx";
            }
        };
        body.add("files", resource);

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<byte[]> response = restTemplate.postForEntity(endpoint, requestEntity, byte[].class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new IOException("Failed to convert document via Gotenberg. Status: " + response.getStatusCode());
            }
            return response.getBody();
        } catch (Exception e) {
            throw new IOException("Error communicating with Gotenberg: " + e.getMessage(), e);
        }
    }
}
