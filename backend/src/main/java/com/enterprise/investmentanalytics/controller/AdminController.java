package com.enterprise.investmentanalytics.controller;

import com.enterprise.investmentanalytics.dto.request.RegisterRequest;
import com.enterprise.investmentanalytics.dto.request.CreateClientRequest;
import com.enterprise.investmentanalytics.dto.request.UpdateUserRequest;
import com.enterprise.investmentanalytics.dto.response.AuthenticationResponse;
import com.enterprise.investmentanalytics.dto.response.DepositRequestDTO;
import com.enterprise.investmentanalytics.dto.response.WithdrawalRequestDTO;
import com.enterprise.investmentanalytics.model.entity.User;
import com.enterprise.investmentanalytics.repository.UserRepository;
import com.enterprise.investmentanalytics.service.AuthenticationService;
import com.enterprise.investmentanalytics.service.WithdrawalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AuthenticationService authenticationService;

    private final UserRepository userRepository;

    private final com.enterprise.investmentanalytics.service.PortfolioService portfolioService;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final WithdrawalService withdrawalService;
    private final com.enterprise.investmentanalytics.service.AuditService auditService;
    private final com.enterprise.investmentanalytics.service.UserIdGeneratorService userIdGeneratorService;
    private final com.enterprise.investmentanalytics.service.TransactionService transactionService;
    private final com.enterprise.investmentanalytics.repository.MonthlyProfitHistoryRepository monthlyProfitHistoryRepository;
    private final com.enterprise.investmentanalytics.service.DepositService depositService;
    private final com.enterprise.investmentanalytics.service.PayoutRequestService payoutRequestService;
    private final com.enterprise.investmentanalytics.repository.PortfolioRepository portfolioRepository;
    private final com.enterprise.investmentanalytics.repository.TransactionRepository transactionRepository;
    private final com.enterprise.investmentanalytics.service.DeleteRequestService deleteRequestService;

    @PostMapping("/users")
    public ResponseEntity<AuthenticationResponse> createUser(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authenticationService.register(request));
    }

    @GetMapping("/pending-users")
    public ResponseEntity<List<com.enterprise.investmentanalytics.dto.response.PendingUserDTO>> getPendingUsers() {
        return ResponseEntity.ok(userRepository.findAll().stream()
                .filter(u -> u
                        .getStatus() == com.enterprise.investmentanalytics.model.enums.UserStatus.PENDING_APPROVAL)
                .map(u -> com.enterprise.investmentanalytics.dto.response.PendingUserDTO.builder()
                        .id(u.getId())
                        .userId(u.getUserId())
                        .name(u.getName())
                        .email(u.getEmail())
                        .mobile(u.getMobile())
                        .role(u.getRole().toString())
                        .mediatorName(u.getMediator() != null ? u.getMediator().getName() : "Direct")
                        .createdAt(u.getCreatedAt())
                        .build())
                .toList());
    }

    @PostMapping("/users/{id}/approve")
    public ResponseEntity<?> approveUser(@PathVariable UUID id, @AuthenticationPrincipal User admin) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        user.setStatus(com.enterprise.investmentanalytics.model.enums.UserStatus.ACTIVE);
        userRepository.save(user);

        // Also create portfolio if not exists? Usually done on creation but here we
        // might want to do it now.
        // But for now just activate.

        auditService.log("APPROVE_USER", "ADMIN", "Admin " + admin.getEmail() + " approved user " + user.getId());
        return ResponseEntity.ok(java.util.Map.of("message", "User approved successfully"));
    }

    @PostMapping("/users/{id}/reject")
    public ResponseEntity<?> rejectUser(@PathVariable UUID id, @AuthenticationPrincipal User admin) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        user.setStatus(com.enterprise.investmentanalytics.model.enums.UserStatus.REJECTED);
        userRepository.save(user);

        auditService.log("REJECT_USER", "ADMIN", "Admin " + admin.getEmail() + " rejected user " + user.getId());
        return ResponseEntity.ok(java.util.Map.of("message", "User request rejected"));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable @NonNull UUID id, @AuthenticationPrincipal User admin) {
        if (admin == null) {
            return ResponseEntity.status(401).body(java.util.Map.of("message", "Unauthorized"));
        }
        try {
            deleteRequestService.deactivateUser(id, admin.getEmail());
            return ResponseEntity.ok(java.util.Map.of("message", "User deactivated successfully"));
        } catch (Exception e) {
            System.err.println("Deactivation failed for user " + id + ": " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(java.util.Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/users/{id}/reactivate")
    public ResponseEntity<?> reactivateUser(@PathVariable @NonNull UUID id, @AuthenticationPrincipal User admin) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        user.setStatus(com.enterprise.investmentanalytics.model.enums.UserStatus.ACTIVE);
        user.setDeleted(false);
        user.setDeletedAt(null);
        user.setDeletedBy(null);
        userRepository.save(user);

        auditService.log("REACTIVATE_USER", "ADMIN", "Admin " + admin.getEmail() + " reactivated user " + user.getId());
        return ResponseEntity.ok(java.util.Map.of("message", "User reactivated successfully"));
    }

    @DeleteMapping("/users/{id}/permanent")
    public ResponseEntity<?> deleteUserPermanently(@PathVariable UUID id, @AuthenticationPrincipal User admin) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        if (!user.isDeleted()
                && user.getStatus() != com.enterprise.investmentanalytics.model.enums.UserStatus.INACTIVE) {
            throw new RuntimeException("Only inactive users can be deleted permanently");
        }

        deleteRequestService.performPermanentDelete(id);

        auditService.log("PERMANENT_DELETE_USER", "ADMIN",
                "Admin " + admin.getEmail() + " permanently deleted user " + id);
        return ResponseEntity.ok(java.util.Map.of("message", "User deleted permanently from database"));
    }

    @GetMapping("/users")
    public ResponseEntity<List<com.enterprise.investmentanalytics.dto.response.UserDTO>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAllWithMediator().stream()
                .map(this::mapToUserDTO)
                .toList());
    }

    @GetMapping("/clients")
    public ResponseEntity<List<com.enterprise.investmentanalytics.dto.response.AdminClientSummaryDTO>> getClientsSummary() {
        return ResponseEntity.ok(portfolioService.getAdminClientSummaries());
    }

    @GetMapping("/clients/inactive")
    public ResponseEntity<List<com.enterprise.investmentanalytics.dto.response.AdminClientSummaryDTO>> getInactiveClientsSummary() {
        return ResponseEntity.ok(portfolioService.getInactiveClientSummaries());
    }

    @GetMapping("/mediator/{id}/clients")
    public ResponseEntity<List<com.enterprise.investmentanalytics.dto.response.AdminClientSummaryDTO>> getMediatorClients(
            @PathVariable UUID id) {
        return ResponseEntity.ok(portfolioService.getClientSummariesByMediator(id));
    }

    @GetMapping("/client/{id}/portfolio")
    public ResponseEntity<Map<String, Object>> getClientPortfolio(@PathVariable UUID id) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        com.enterprise.investmentanalytics.model.entity.Portfolio portfolio = portfolioService
                .getPortfolioByEmail(user.getEmail());

        // Calculate current month profit
        java.time.LocalDate now = java.time.LocalDate.now();
        int currentMonth = now.getMonthValue();
        int currentYear = now.getYear();

        java.math.BigDecimal currentMonthProfit = monthlyProfitHistoryRepository
                .findByUserIdAndMonthAndYear(user.getId(), currentMonth, currentYear)
                .map(com.enterprise.investmentanalytics.model.entity.MonthlyProfitHistory::getProfitAmount)
                .orElse(java.math.BigDecimal.ZERO);

        Map<String, Object> response = new HashMap<>();
        // Flatten Portfolio into the response for backward compatibility if possible,
        // or frontend needs update.
        // Frontend previously did: setClientPortfolio(response) -> accessed
        // response.user, response.totalInvested etc.
        // So we must replicate portfolio structure or wrap it.
        // IF we return the portfolio object directly, we can't add fields easily
        // without weirdness.
        // Strategy: Return a Map that *contains* all portfolio fields + our new ones.

        // Manual mapping (safe) or ObjectMapper (cleaner). Let's do manual for specific
        // fields needed by PayoutModal
        // Actually, PayoutModal uses: user (nested object), availableProfit,
        // totalInvested, totalValue, profitPercentage.

        response.put("id", portfolio.getId());
        response.put("user", mapToUserDTO(portfolio.getUser()));
        response.put("totalValue", portfolio.getTotalValue());
        response.put("totalInvested", portfolio.getTotalInvested());
        response.put("availableProfit", portfolio.getAvailableProfit());
        response.put("profitPercentage", portfolio.getProfitPercentage());
        response.put("profitAccrualStatus", portfolio.getProfitAccrualStatus());
        // Add new field
        response.put("currentMonthProfit", currentMonthProfit);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/clients/{id}/transactions")
    public ResponseEntity<List<com.enterprise.investmentanalytics.dto.response.TransactionResponse>> getClientTransactions(
            @PathVariable UUID id) {
        return ResponseEntity.ok(transactionService.getTransactionsByUserId(id));
    }

    @PostMapping("/dev/seed-sample-clients")
    public ResponseEntity<java.util.Map<String, Object>> seedSampleClients() {
        List<com.enterprise.investmentanalytics.dto.response.AdminClientSummaryDTO> clients = portfolioService
                .seedSampleClients(passwordEncoder);

        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("success", true);
        response.put("message", "Created " + clients.size() + " sample clients");
        response.put("clients", clients);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/create-client")
    public ResponseEntity<java.util.Map<String, Object>> createClient(@RequestBody CreateClientRequest request) {
        try {
            // Generate email from name
            String email = request.getFullName().toLowerCase().replace(" ", ".") + "@mvktraders.com";

            // Check if user already exists
            if (userRepository.findByEmail(email).isPresent()) {
                java.util.Map<String, Object> errorResponse = new java.util.HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "A user with similar name already exists");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            // Assign sequential IDs
            Long nId = userIdGeneratorService.getNextNId(userRepository);
            String userId = userIdGeneratorService.generateUserIdFromNId(nId);

            // Create user
            User newUser = User.builder()
                    .name(request.getFullName())
                    .email(email)
                    .password(passwordEncoder.encode(
                            (request.getPassword() != null && !request.getPassword().isEmpty())
                                    ? request.getPassword()
                                    : "client@321"))
                    .role(com.enterprise.investmentanalytics.model.enums.Role.CLIENT)
                    .status(com.enterprise.investmentanalytics.model.enums.UserStatus.ACTIVE)
                    .mobile(request.getPhoneNumber())
                    .sequentialId(nId)
                    .userId(userId)
                    .build();

            newUser = userRepository.save(newUser);

            // Create portfolio

            portfolioService.createPortfolioForUser(newUser, request.getInvestmentAmount());

            // Create response
            java.util.Map<String, Object> response = new java.util.HashMap<>();
            response.put("success", true);
            response.put("message", "Client created successfully");
            response.put("email", email);
            response.put("defaultPassword", "Pass@123");
            response.put("userId", newUser.getUserId()); // Return business identifier

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            java.util.Map<String, Object> errorResponse = new java.util.HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Failed to create client: " + e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    @PostMapping("/create-mediator")
    public ResponseEntity<java.util.Map<String, Object>> createMediator(@RequestBody RegisterRequest request) {
        try {
            // Check if user already exists
            if (userRepository.findByEmail(request.getEmail()).isPresent()) {
                java.util.Map<String, Object> errorResponse = new java.util.HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "A user with this email already exists");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            // Assign sequential IDs
            Long nId = userIdGeneratorService.getNextNId(userRepository);
            String userId = userIdGeneratorService.generateUserIdFromNId(nId);

            // Create user
            User newUser = User.builder()
                    .name(request.getName())
                    .email(request.getEmail())
                    .password(passwordEncoder.encode(
                            (request.getPassword() != null && !request.getPassword().isEmpty())
                                    ? request.getPassword()
                                    : "agent@321"))
                    .role(com.enterprise.investmentanalytics.model.enums.Role.MEDIATOR)
                    .status(com.enterprise.investmentanalytics.model.enums.UserStatus.ACTIVE)
                    .mobile(request.getMobile())
                    .sequentialId(nId)
                    .userId(userId)
                    .build();

            newUser = userRepository.save(newUser);

            // Create response
            java.util.Map<String, Object> response = new java.util.HashMap<>();
            response.put("success", true);
            response.put("message", "Mediator created successfully");
            response.put("userId", newUser.getUserId());
            response.put("email", newUser.getEmail());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            java.util.Map<String, Object> errorResponse = new java.util.HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Failed to create mediator: " + e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<Map<String, Object>> updateUser(@PathVariable UUID id,
            @RequestBody UpdateUserRequest request) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getName() != null && !request.getName().isEmpty()) {
            user.setName(request.getName());
        }

        if (request.getMobile() != null && !request.getMobile().isEmpty()) {
            user.setMobile(request.getMobile());
        }

        if (request.getEmail() != null && !request.getEmail().isEmpty()
                && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.findByEmail(request.getEmail()).isPresent()) {
                throw new RuntimeException("Email already in use");
            }
            user.setEmail(request.getEmail());
        }

        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        if (request.getStatus() != null) {
            try {
                user.setStatus(com.enterprise.investmentanalytics.model.enums.UserStatus.valueOf(request.getStatus()));
            } catch (Exception e) {
                // Ignore invalid status or handle error
            }
        }

        userRepository.save(user);

        return ResponseEntity.ok(Map.of("success", true, "message", "User updated successfully"));
    }

    // Withdrawal Request Management
    @PostMapping("/withdrawal-request/{userId}")
    public ResponseEntity<Map<String, Object>> createWithdrawalRequestForUser(
            @PathVariable String userId,
            @RequestBody com.enterprise.investmentanalytics.dto.request.CreateWithdrawalRequestDTO request) {
        try {
            User user = userRepository.findByUserId(userId)
                    .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

            WithdrawalRequestDTO withdrawalRequest = withdrawalService.createWithdrawalRequest(
                    user.getId(),
                    request.getAmount());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Withdrawal request submitted successfully");
            response.put("request", withdrawalRequest);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    // Deposit Request Management
    @PostMapping("/deposit-request/{userId}")
    public ResponseEntity<Map<String, Object>> createDepositRequestForUser(
            @PathVariable String userId,
            @RequestBody Map<String, Object> request) {
        try {
            User user = userRepository.findByUserId(userId)
                    .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

            java.math.BigDecimal amount = new java.math.BigDecimal(request.get("amount").toString());
            String note = request.get("note") != null ? request.get("note").toString() : "Admin initiated deposit";

            DepositRequestDTO depositRequest = depositService.createDepositRequest(
                    user.getId(),
                    amount,
                    null, // No screenshot for admin-initiated deposits
                    note);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Deposit request created successfully");
            response.put("request", depositRequest);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @GetMapping("/withdrawal-requests")
    public ResponseEntity<List<WithdrawalRequestDTO>> getAllWithdrawalRequests() {
        return ResponseEntity.ok(withdrawalService.getAllWithdrawalRequests());
    }

    @PostMapping("/withdrawal-requests/{id}/approve")
    public ResponseEntity<Map<String, Object>> approveWithdrawalRequest(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User admin) {
        try {
            if (admin == null) {
                throw new RuntimeException("Admin principal is missing");
            }
            String adminId = admin.getUserId();
            if (adminId == null) {
                adminId = admin.getEmail();
            }

            String paymentMode = body.getOrDefault("paymentMode", "Other");
            System.out.println("Approving withdrawal " + id + " by " + adminId + " mode " + paymentMode);

            WithdrawalRequestDTO request = withdrawalService.approveWithdrawalRequest(id, adminId,
                    paymentMode);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Withdrawal request approved successfully");
            response.put("request", request);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message",
                    "Approval Failed: " + (e.getMessage() != null ? e.getMessage() : e.toString()));
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/withdrawal-requests/{id}/reject")
    public ResponseEntity<Map<String, Object>> rejectWithdrawalRequest(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User admin) {
        try {
            String reason = body.getOrDefault("reason", "No reason provided");
            WithdrawalRequestDTO request = withdrawalService.rejectWithdrawalRequest(id, admin.getUserId(), reason);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Withdrawal request rejected");
            response.put("request", request);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/payout")
    public ResponseEntity<Map<String, Object>> createPayout(
            @RequestParam("userId") UUID userId,
            @RequestParam("amount") java.math.BigDecimal amount,
            @RequestParam(value = "message", required = false) String message,
            @RequestParam("screenshot") org.springframework.web.multipart.MultipartFile screenshot) {
        try {
            // Save file
            String fileName = UUID.randomUUID().toString() + "_" + screenshot.getOriginalFilename();
            java.nio.file.Path uploadPath = java.nio.file.Paths.get("uploads/payouts");
            if (!java.nio.file.Files.exists(uploadPath)) {
                java.nio.file.Files.createDirectories(uploadPath);
            }
            java.nio.file.Path filePath = uploadPath.resolve(fileName);
            java.nio.file.Files.copy(screenshot.getInputStream(), filePath,
                    java.nio.file.StandardCopyOption.REPLACE_EXISTING);

            // Call service
            com.enterprise.investmentanalytics.dto.response.TransactionResponse transaction = transactionService
                    .createPayout(userId, amount, filePath.toString(), message);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Payout recorded successfully");
            response.put("transaction", transaction);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Failed to process payout: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/client/{clientId}/transaction")
    public ResponseEntity<Map<String, Object>> createManualTransaction(
            @PathVariable UUID clientId,
            @RequestBody com.enterprise.investmentanalytics.dto.request.AdminTransactionRequest request) {
        try {
            com.enterprise.investmentanalytics.dto.response.TransactionResponse transaction = transactionService
                    .createManualTransaction(clientId, request.getAmount(), request.getType(), request.getNote());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Transaction processed successfully");
            response.put("transaction", transaction);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/impersonate/{userId}")
    public ResponseEntity<AuthenticationResponse> impersonateUser(@PathVariable java.util.UUID userId) {
        return ResponseEntity.ok(authenticationService.impersonate(userId));
    }

    // Deposit Request Management
    @GetMapping("/deposit-requests")
    public ResponseEntity<List<DepositRequestDTO>> getAllDepositRequests() {
        return ResponseEntity.ok(depositService.getAllDepositRequests());
    }

    @PostMapping("/deposit-requests/{id}/approve")
    public ResponseEntity<Map<String, Object>> approveDepositRequest(
            @PathVariable @NonNull UUID id,
            @RequestBody Map<String, String> body) {
        try {
            String note = body.getOrDefault("note", "");
            DepositRequestDTO request = depositService.approveDepositRequest(id, note);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Deposit request approved successfully");
            response.put("request", request);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/deposit-requests/{id}/reject")
    public ResponseEntity<Map<String, Object>> rejectDepositRequest(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        try {
            String reason = body.getOrDefault("reason", "No reason provided");
            DepositRequestDTO request = depositService.rejectDepositRequest(id, reason);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Deposit request rejected");
            response.put("request", request);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/users/{userId}/delete")
    public ResponseEntity<?> deleteUser(
            @PathVariable UUID userId,
            @RequestBody java.util.Map<String, String> request,
            @AuthenticationPrincipal User admin) {
        String password = request.get("password");
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (target.getRole() == com.enterprise.investmentanalytics.model.enums.Role.MEDIATOR) {
            deleteRequestService.deleteMediator(userId, admin, password);
        } else {
            deleteRequestService.deleteClient(userId, admin, password);
        }
        return ResponseEntity.ok(java.util.Map.of("message", "User deleted successfully"));
    }

    @GetMapping("/delete-requests")
    public ResponseEntity<List<com.enterprise.investmentanalytics.dto.response.DeleteRequestDTO>> getPendingDeleteRequests() {
        return ResponseEntity.ok(deleteRequestService.getAllPendingRequests());
    }

    @PostMapping("/delete-requests/{requestId}/approve")
    public ResponseEntity<?> approveDeleteRequest(
            @PathVariable UUID requestId,
            @RequestBody java.util.Map<String, String> request,
            @AuthenticationPrincipal User admin) {
        String password = request.get("password");
        deleteRequestService.approveDeleteRequest(requestId, admin, password);
        return ResponseEntity.ok(java.util.Map.of("message", "Request approved and user deleted"));
    }

    @PostMapping("/delete-requests/{requestId}/reject")
    public ResponseEntity<?> rejectDeleteRequest(
            @PathVariable UUID requestId,
            @AuthenticationPrincipal User admin) {
        deleteRequestService.rejectDeleteRequest(requestId, admin);
        return ResponseEntity.ok(java.util.Map.of("message", "Request rejected"));
    }

    // --- Payout Request Management ---

    @GetMapping("/payout-requests")
    public ResponseEntity<List<com.enterprise.investmentanalytics.dto.response.PayoutRequestDTO>> getAllPayoutRequests() {
        return ResponseEntity.ok(payoutRequestService.getAllRequests());
    }

    @PostMapping("/payout-requests/{id}/approve")
    public ResponseEntity<com.enterprise.investmentanalytics.dto.response.PayoutRequestDTO> approvePayoutRequest(
            @PathVariable UUID id,
            @AuthenticationPrincipal User admin) {
        return ResponseEntity.ok(payoutRequestService.approveRequest(id, admin.getEmail()));
    }

    @PostMapping("/payout-requests/{id}/reject")
    public ResponseEntity<com.enterprise.investmentanalytics.dto.response.PayoutRequestDTO> rejectPayoutRequest(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User admin) {
        String reason = body.getOrDefault("reason", "Rejected by admin");
        return ResponseEntity.ok(payoutRequestService.rejectRequest(id, admin.getEmail(), reason));
    }

    private com.enterprise.investmentanalytics.dto.response.UserDTO mapToUserDTO(User user) {
        return com.enterprise.investmentanalytics.dto.response.UserDTO.builder()
                .id(user.getId())
                .sequentialId(user.getSequentialId())
                .userId(user.getUserId())
                .name(user.getName())
                .email(user.getEmail())
                .mobile(user.getMobile())
                .role(user.getRole())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .isDeleted(user.isDeleted())
                .mediatorName(user.getMediator() != null ? user.getMediator().getName() : null)
                .mediatorId(user.getMediator() != null ? user.getMediator().getId() : null)
                .build();
    }
}
