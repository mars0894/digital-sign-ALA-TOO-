package kg.edu.alatoo.sign.controller;

import jakarta.validation.Valid;
import kg.edu.alatoo.sign.entity.Role;
import kg.edu.alatoo.sign.entity.User;
import kg.edu.alatoo.sign.payload.request.LoginRequest;
import kg.edu.alatoo.sign.payload.request.SignupRequest;
import kg.edu.alatoo.sign.payload.request.TwoFactorRequest;
import kg.edu.alatoo.sign.payload.response.JwtResponse;
import kg.edu.alatoo.sign.payload.response.MessageResponse;
import kg.edu.alatoo.sign.payload.response.TwoFactorResponse;
import kg.edu.alatoo.sign.repository.RoleRepository;
import kg.edu.alatoo.sign.repository.UserRepository;
import kg.edu.alatoo.sign.security.JwtUtils;
import kg.edu.alatoo.sign.service.AuditService;
import kg.edu.alatoo.sign.service.TwoFactorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder encoder;
    private final JwtUtils jwtUtils;
    private final AuditService auditService;
    private final TwoFactorService twoFactorService;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));

            User user = (User) authentication.getPrincipal();
            
            if (user.isTwoFactorEnabled()) {
                twoFactorService.sendVerificationCode(user.getEmail());
                String preAuthToken = jwtUtils.generatePreAuthToken(user.getEmail());
                auditService.log(user.getEmail(), "2FA_INITIATED", user.getId().toString(), true, "2FA code sent");
                return ResponseEntity.ok(new TwoFactorResponse("2FA_REQUIRED", preAuthToken));
            }

            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = jwtUtils.generateJwtToken((org.springframework.security.core.userdetails.UserDetails) authentication.getPrincipal());

            List<String> roles = user.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .collect(Collectors.toList());

            auditService.log(user.getEmail(), "LOGIN", user.getId().toString(), true, "Successful login (2FA skipped)");

            ResponseCookie jwtCookie = ResponseCookie.from("jwt_token", jwt)
                    .httpOnly(true)
                    .secure(false) // Dev environment over HTTP
                    .path("/")
                    .maxAge(24 * 60 * 60)
                    .sameSite("Strict")
                    .build();

            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, jwtCookie.toString())
                    .body(new JwtResponse(jwt,
                            user.getId(),
                            user.getEmail(),
                            user.getFirstName(),
                            user.getLastName(),
                            roles));
        } catch (Exception e) {
            auditService.log(loginRequest.getEmail(), "LOGIN", null, false, "Login failure: " + e.getMessage());
            throw e;
        }
    }

    @PostMapping("/verify-2fa")
    public ResponseEntity<?> verify2fa(@Valid @RequestBody TwoFactorRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!jwtUtils.validatePreAuthToken(request.getPreAuthToken(), user.getEmail())) {
            auditService.log(user.getEmail(), "2FA_VERIFY", user.getId().toString(), false, "Invalid or missing preAuthToken");
            return ResponseEntity.status(401).body(new MessageResponse("Error: Invalid session. Please log in again."));
        }

        if (!twoFactorService.verifyCode(user.getEmail(), request.getCode())) {
            auditService.log(user.getEmail(), "2FA_VERIFY", user.getId().toString(), false, "Invalid 2FA code");
            return ResponseEntity.status(401).body(new MessageResponse("Error: Invalid 2FA code"));
        }

        String jwt = jwtUtils.generateJwtToken(user);
        List<String> roles = user.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        auditService.log(user.getEmail(), "LOGIN", user.getId().toString(), true, "Successful login with 2FA");

        ResponseCookie jwtCookie = ResponseCookie.from("jwt_token", jwt)
                .httpOnly(true)
                .secure(false) // Dev environment over HTTP
                .path("/")
                .maxAge(24 * 60 * 60)
                .sameSite("Strict")
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, jwtCookie.toString())
                .body(new JwtResponse(jwt,
                        user.getId(),
                        user.getEmail(),
                        user.getFirstName(),
                        user.getLastName(),
                        roles));
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Email is already in use!"));
        }

        User user = User.builder()
                .email(signUpRequest.getEmail())
                .password(encoder.encode(signUpRequest.getPassword()))
                .firstName(signUpRequest.getFirstName())
                .lastName(signUpRequest.getLastName())
                .isActive(true)
                .build();

        Set<Role> roles = new HashSet<>();
        Role userRole = roleRepository.findByName("ROLE_USER")
                .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
        roles.add(userRole);

        user.setRoles(roles);
        userRepository.save(user);

        return ResponseEntity.ok(new MessageResponse("User registered successfully!"));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logoutUser() {
        ResponseCookie jwtCookie = ResponseCookie.from("jwt_token", "")
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(0) // Expire immediately
                .sameSite("Strict")
                .build();
                
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, jwtCookie.toString())
                .body(new MessageResponse("You've been signed out!"));
    }
}
