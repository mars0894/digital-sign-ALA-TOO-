package kg.edu.alatoo.sign.security;

import kg.edu.alatoo.sign.entity.Role;
import kg.edu.alatoo.sign.entity.User;
import kg.edu.alatoo.sign.repository.RoleRepository;
import kg.edu.alatoo.sign.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final JwtUtils jwtUtils;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        
        String tempFirstName = "";
        String tempLastName = "";
        if (name != null) {
            String[] parts = name.split(" ");
            if (parts.length > 0) tempFirstName = parts[0];
            if (parts.length > 1) tempLastName = parts[1];
        }

        final String firstName = tempFirstName;
        final String lastName = tempLastName;

        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = User.builder()
                    .email(email)
                    .firstName(firstName)
                    .lastName(lastName)
                    .password(UUID.randomUUID().toString()) // Random password since login is via OAuth
                    .isActive(true)
                    .build();

            Set<Role> roles = new HashSet<>();
            Optional<Role> userRole = roleRepository.findByName("ROLE_USER");
            userRole.ifPresent(roles::add);
            newUser.setRoles(roles);

            return userRepository.save(newUser);
        });

        // Generate JWT token for the OAuth2 user
        String token = jwtUtils.generateJwtToken(user);

        // Set JWT as HttpOnly cookie (not accessible via JavaScript)
        jakarta.servlet.http.Cookie cookie = new jakarta.servlet.http.Cookie("auth_token", token);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(24 * 60 * 60); // 24 hours
        cookie.setAttribute("SameSite", "Strict");
        response.addCookie(cookie);

        // Redirect to dashboard without token in URL
        getRedirectStrategy().sendRedirect(request, response, "http://localhost:3000/dashboard");
    }
}
