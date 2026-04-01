package kg.edu.alatoo.sign.service;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;

@Service
public class SecureDownloadTokenService {

    @Value("${jwt.secret}")
    private String jwtSecret;

    // Short-lived token for download (60 seconds)
    private static final long EXPIRATION_MS = 60 * 1000;

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes());
    }

    public String generateDownloadToken(String fileKey, String userEmail) {
        return Jwts.builder()
                .setSubject(userEmail)
                .claim("fileKey", fileKey)
                .claim("type", "download")
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_MS))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String validateTokenAndGetFileKey(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            String type = claims.get("type", String.class);
            if (!"download".equals(type)) {
                throw new RuntimeException("Invalid token type.");
            }

            return claims.get("fileKey", String.class);
        } catch (JwtException e) {
            throw new RuntimeException("Invalid or expired download token.");
        }
    }
}
