package kg.edu.alatoo.sign.controller;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.util.UUID;

@Controller
@Slf4j
public class SignWebSocketController {

    @Data
    public static class LiveElementEvent {
        private String documentId;
        private String action; // ADD, UPDATE, DELETE
        private String senderEmail;
        private PlacedElementDTO element;
    }

    @Data
    public static class CursorEvent {
        private String documentId;
        private String senderEmail;
        private double x;
        private double y;
        private String userName;
    }

    @Data
    public static class PlacedElementDTO {
        private String id;
        private String signatureData;
        private int pageNumber;
        private double x;
        private double y;
        private double width;
        private double height;
        private String type;
        private String color;
        private Double fontSize;
        private String fontName;
    }

    @MessageMapping("/document/{documentId}/event")
    @SendTo("/topic/document/{documentId}")
    public LiveElementEvent broadcastEvent(
            @DestinationVariable UUID documentId,
            @Payload LiveElementEvent event
    ) {
        log.debug("Broadcasting {} event for doc {}", event.getAction(), documentId);
        return event;
    }

    @MessageMapping("/document/{documentId}/cursor")
    @SendTo("/topic/document/{documentId}/cursor")
    public CursorEvent broadcastCursor(
            @DestinationVariable UUID documentId,
            @Payload CursorEvent event
    ) {
        return event;
    }
}
