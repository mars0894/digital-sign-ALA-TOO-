package kg.edu.alatoo.sign.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

@Component
@Order(1) // Run before security filter
public class RateLimitingFilter extends OncePerRequestFilter {

    private final Map<String, RateLimitInfo> requestCounts = new ConcurrentHashMap<>();
    
    // Limits: 100 requests per minute per IP
    private static final int MAX_REQUESTS = 100;
    private static final long TIME_WINDOW = TimeUnit.MINUTES.toMillis(1);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String clientIp = request.getRemoteAddr();
        long now = System.currentTimeMillis();
        
        RateLimitInfo info = requestCounts.compute(clientIp, (ip, currentInfo) -> {
            if (currentInfo == null || now - currentInfo.startTime > TIME_WINDOW) {
                return new RateLimitInfo(now, new AtomicInteger(1));
            }
            currentInfo.count.incrementAndGet();
            return currentInfo;
        });

        if (info.count.get() > MAX_REQUESTS) {
            response.setStatus(429); // Too Many Requests
            response.getWriter().write("Too many requests. Please try again later.");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private static class RateLimitInfo {
        final long startTime;
        final AtomicInteger count;

        RateLimitInfo(long startTime, AtomicInteger count) {
            this.startTime = startTime;
            this.count = count;
        }
    }
}
