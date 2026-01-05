package com.enterprise.investmentanalytics.service;

import com.enterprise.investmentanalytics.dto.request.AuthenticationRequest;
import com.enterprise.investmentanalytics.dto.request.ChangePasswordRequest;
import com.enterprise.investmentanalytics.dto.request.RegisterRequest;
import com.enterprise.investmentanalytics.dto.response.AuthenticationResponse;
import com.enterprise.investmentanalytics.model.entity.User;
import com.enterprise.investmentanalytics.model.enums.Role;
import com.enterprise.investmentanalytics.model.enums.UserStatus;
import com.enterprise.investmentanalytics.repository.UserRepository;
import com.enterprise.investmentanalytics.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthenticationService {
        private final UserRepository repository;
        private final PasswordEncoder passwordEncoder;
        private final JwtService jwtService;
        private final AuthenticationManager authenticationManager;
        private final AuditService auditService;
        private final PortfolioService portfolioService;
        private final com.enterprise.investmentanalytics.service.UserIdGeneratorService userIdGeneratorService;

        public AuthenticationResponse register(RegisterRequest request) {
                // Step 1: Assign sequential IDs before save
                Long nId = userIdGeneratorService.getNextNId(repository);
                String userId = request.getUserId() != null ? request.getUserId()
                                : userIdGeneratorService.generateUserIdFromNId(nId);

                var user = User.builder()
                                .name(request.getName())
                                .email(request.getEmail())
                                .password(passwordEncoder.encode(request.getPassword()))
                                .role(request.getRole())
                                .status(UserStatus.ACTIVE)
                                .mobile(request.getMobile())
                                .sequentialId(nId)
                                .userId(userId)
                                .build();

                // Step 2: Save user with all IDs already set
                var savedUser = repository.save(user);

                // Step 3: Generate JWT tokens
                var jwtToken = jwtService.generateToken(savedUser);
                var refreshToken = jwtService.generateRefreshToken(savedUser);

                auditService.log("REGISTER_USER", "USER", savedUser.getUserId());

                return AuthenticationResponse.builder()
                                .accessToken(jwtToken)
                                .refreshToken(refreshToken)
                                .build();
        }

        public void registerPending(RegisterRequest request, User mediator) {
                // Ensure we have a managed mediator entity
                User managedMediator = repository.findById(mediator.getId())
                                .orElseThrow(() -> new RuntimeException("Mediator not found"));

                // Assign sequential IDs
                Long nId = userIdGeneratorService.getNextNId(repository);
                String userId = userIdGeneratorService.generateUserIdFromNId(nId);

                // Mapping logic for different frontend keys
                String name = request.getName() != null ? request.getName() : request.getFullName();
                String mobile = request.getMobile() != null ? request.getMobile() : request.getPhoneNumber();
                String email = request.getEmail();

                if (email == null || email.isEmpty()) {
                        if (name != null && !name.isEmpty()) {
                                email = name.toLowerCase().replace(" ", ".") + "@mvktraders.com";
                        } else {
                                throw new RuntimeException("Email or Name is required");
                        }
                }

                if (repository.findByEmail(email).isPresent()) {
                        throw new RuntimeException("User with email " + email + " already exists");
                }

                String rawPassword = (request.getPassword() != null && !request.getPassword().isEmpty())
                                ? request.getPassword()
                                : "client@321";

                var user = User.builder()
                                .name(name)
                                .email(email)
                                .password(passwordEncoder.encode(rawPassword))
                                .role(request.getRole() != null ? request.getRole()
                                                : com.enterprise.investmentanalytics.model.enums.Role.CLIENT)
                                .status(UserStatus.PENDING_APPROVAL)
                                .mobile(mobile)
                                .sequentialId(nId)
                                .userId(userId)
                                .mediator(managedMediator)
                                .build();

                var savedUser = repository.save(user);

                // create portfolio immediately
                if (request.getInvestmentAmount() != null) {
                        portfolioService.createPortfolioForUser(savedUser, request.getInvestmentAmount(),
                                        request.getPercentageOffered());
                }

                auditService.log("REQUEST_CREATE_USER", "MEDIATOR",
                                "Mediator " + managedMediator.getEmail() + " requested user " + savedUser.getUserId());
        }

        public AuthenticationResponse authenticate(AuthenticationRequest request) {
                String identifier = request.getEmail();

                // Fetch user first to check status
                var userOptional = identifier.startsWith("SM")
                                ? repository.findByUserId(identifier)
                                : repository.findByEmail(identifier);

                if (userOptional.isEmpty()) {
                        throw new RuntimeException("Invalid user id or email");
                }

                var user = userOptional.get();

                if (user.getStatus() == UserStatus.BLOCKED) {
                        throw new RuntimeException(
                                        "Access Denied: Your account has been blocked. Please contact support.");
                }

                if (user.getStatus() == UserStatus.PENDING_APPROVAL) {
                        throw new RuntimeException("Access Denied: Your account is pending approval.");
                }

                // Authenticate with Spring Security
                authenticationManager.authenticate(
                                new UsernamePasswordAuthenticationToken(
                                                identifier,
                                                request.getPassword()));

                var jwtToken = jwtService.generateToken(user);
                var refreshToken = jwtService.generateRefreshToken(user);

                auditService.log("LOGIN", "USER", user.getId().toString());

                return AuthenticationResponse.builder()
                                .accessToken(jwtToken)
                                .refreshToken(refreshToken)
                                .build();
        }

        public void changePassword(ChangePasswordRequest request, User connectedUser) {
                // checks
                if (!request.getNewPassword().equals(request.getConfirmationPassword())) {
                        throw new IllegalStateException("Password are not the same");
                }

                // check if the current password is correct
                if (!passwordEncoder.matches(request.getCurrentPassword(), connectedUser.getPassword())) {
                        throw new IllegalStateException("Wrong password");
                }

                // update the password
                connectedUser.setPassword(passwordEncoder.encode(request.getNewPassword()));

                // save the new password
                repository.save(connectedUser);

                auditService.log("CHANGE_PASSWORD", "USER", connectedUser.getId().toString());
        }

        public AuthenticationResponse impersonate(java.util.UUID userId) {
                User user = repository.findById(userId)
                                .orElseThrow(() -> new RuntimeException("User not found"));
                var jwtToken = jwtService.generateToken(user);
                var refreshToken = jwtService.generateRefreshToken(user);

                auditService.log("IMPERSONATE", "ADMIN", "Impersonated user " + userId);

                return AuthenticationResponse.builder()
                                .accessToken(jwtToken)
                                .refreshToken(refreshToken)
                                .build();
        }
}
