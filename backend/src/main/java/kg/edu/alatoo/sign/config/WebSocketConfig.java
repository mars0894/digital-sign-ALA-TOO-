package kg.edu.alatoo.sign.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import kg.edu.alatoo.sign.security.JwtUtils;
import kg.edu.alatoo.sign.security.CustomUserDetailsService;
import kg.edu.alatoo.sign.repository.DocumentRepository;
import kg.edu.alatoo.sign.repository.DocumentCollaboratorRepository;
import lombok.RequiredArgsConstructor;
import java.util.List;
import java.util.UUID;
import org.springframework.util.StringUtils;
import org.springframework.messaging.simp.config.ChannelRegistration;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${app.cors.allowed-origins}")
    private List<String> allowedOrigins;

    private final JwtUtils jwtUtils;
    private final CustomUserDetailsService userDetailsService;
    private final DocumentRepository documentRepository;
    private final DocumentCollaboratorRepository documentCollaboratorRepository;

    @Override
    public void configureMessageBroker(@org.springframework.lang.NonNull MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(@org.springframework.lang.NonNull StompEndpointRegistry registry) {
      // SockJS is used if the browser does not support or allow native WebSocket.
      registry.addEndpoint("/ws")
              .setAllowedOriginPatterns(allowedOrigins.toArray(new String[0]))
              .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(@org.springframework.lang.NonNull ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(@org.springframework.lang.NonNull Message<?> message, @org.springframework.lang.NonNull MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                
                if (accessor != null && org.springframework.messaging.simp.stomp.StompCommand.CONNECT.equals(accessor.getCommand())) {
                    // Extract JWT. Usually in WebSocket context without cookies we expect it in native headers or passing it via native Stomp headers.
                    // For WebSockets, standard cookies might not flow consistently if cross-origin. Let's look for standard headers or Stomp native auth headers.
                    String authToken = accessor != null ? accessor.getFirstNativeHeader("Authorization") : null;
                    if (StringUtils.hasText(authToken) && authToken.startsWith("Bearer ")) {
                        String jwt = authToken.substring(7);
                        if (jwtUtils.validateJwtToken(jwt)) {
                            String username = jwtUtils.getUserNameFromJwtToken(jwt);
                            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                            Authentication auth = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                            accessor.setUser(auth);
                        }
                    } else {
                         // We might also need to read it from HTTP Session via HandshakeInterceptor if passed as a cookie initially. 
                         // To block unauthenticated connects:
                         throw new org.springframework.messaging.MessageDeliveryException("Unauthorized STOMP connection.");
                    }
                }

                if (accessor != null && org.springframework.messaging.simp.stomp.StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                    String destination = accessor.getDestination();
                    java.security.Principal principal = accessor.getUser();
                    
                    if (destination != null && destination.startsWith("/topic/document/")) {
                        if (principal == null) {
                            throw new org.springframework.messaging.MessageDeliveryException("Unauthorized subscription attempt.");
                        }
                        
                        try {
                            String docIdStr = destination.replace("/topic/document/", "");
                            if (docIdStr.endsWith("/cursor")) {
                                docIdStr = docIdStr.replace("/cursor", "");
                            }
                            UUID docId = UUID.fromString(docIdStr);
                            
                            kg.edu.alatoo.sign.entity.User user = (kg.edu.alatoo.sign.entity.User) ((UsernamePasswordAuthenticationToken) principal).getPrincipal();
                            
                            var document = documentRepository.findById(docId).orElseThrow(() -> new org.springframework.messaging.MessageDeliveryException("Document not found"));
                            
                            if (!document.getOwner().getId().equals(user.getId())) {
                                documentCollaboratorRepository.findByDocumentIdAndUserId(docId, user.getId())
                                    .orElseThrow(() -> new org.springframework.messaging.MessageDeliveryException("Access Denied to WebSocket Channel."));
                            }
                        } catch (Exception e) {
                             throw new org.springframework.messaging.MessageDeliveryException("Access Denied to WebSocket Channel: " + e.getMessage());
                        }
                    }
                }
                
                return message;
            }
        });
    }
}
