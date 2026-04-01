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
import org.springframework.web.util.UriComponentsBuilder;
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

        // We could generate JWT token and redirect to frontend
        String token = jwtUtils.generateJwtToken(user);
        
        String targetUrl = UriComponentsBuilder.fromUriString("http://localhost:3000/oauth2/redirect")
                .fragment("token=" + token)
                .build().toUriString();

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
