package com.enterprise.investmentanalytics.controller;

import com.enterprise.investmentanalytics.dto.request.RegisterRequest;
import com.enterprise.investmentanalytics.dto.response.AdminClientSummaryDTO;
import com.enterprise.investmentanalytics.model.entity.User;
import com.enterprise.investmentanalytics.repository.UserRepository;
import com.enterprise.investmentanalytics.service.AuthenticationService;
import com.enterprise.investmentanalytics.service.PortfolioService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.enterprise.investmentanalytics.dto.response.MediatorClientDTO;

@RestController
@RequestMapping("/api/mediator")
@RequiredArgsConstructor
public class MediatorController {

        private final UserRepository userRepository;
        private final AuthenticationService authenticationService;
        private final PortfolioService portfolioService;
        private final com.enterprise.investmentanalytics.service.WithdrawalService withdrawalService;
        private final com.enterprise.investmentanalytics.service.DepositService depositService;
        private final com.enterprise.investmentanalytics.service.TransactionService transactionService;
        private final com.enterprise.investmentanalytics.service.DeleteRequestService deleteRequestService;
        private final com.enterprise.investmentanalytics.service.PayoutRequestService payoutRequestService;

        @GetMapping("/clients")
        public ResponseEntity<List<MediatorClientDTO>> getClients(@AuthenticationPrincipal User mediator) {
                return ResponseEntity.ok(userRepository.findAllByMediatorId(mediator.getId()).stream()
                                .filter(u -> u.getStatus() == com.enterprise.investmentanalytics.model.enums.UserStatus.ACTIVE)
                                .map(this::mapToMediatorClientDTO)
                                .toList());
        }

        @PostMapping("/client")
        public ResponseEntity<?> createClient(@RequestBody RegisterRequest request,
                        @AuthenticationPrincipal User mediator) {
                authenticationService.registerPending(request, mediator);
                return ResponseEntity.ok(java.util.Map.of(
                                "success", true,
                                "message", "Client creation requested successfully"));
        }

        @GetMapping("/portfolios")
        public ResponseEntity<List<AdminClientSummaryDTO>> getPortfolios(@AuthenticationPrincipal User mediator) {
                return ResponseEntity.ok(portfolioService.getClientSummariesByMediator(mediator.getId()));
        }

        @GetMapping("/pending-users")
        public ResponseEntity<List<MediatorClientDTO>> getPendingUsers(@AuthenticationPrincipal User mediator) {
                return ResponseEntity.ok(userRepository.findAllByMediatorId(mediator.getId()).stream()
                                .filter(u -> u
                                                .getStatus() == com.enterprise.investmentanalytics.model.enums.UserStatus.PENDING_APPROVAL)
                                .map(this::mapToMediatorClientDTO)
                                .toList());
        }

        @PostMapping("/withdrawal-request/{userId}")
        public ResponseEntity<?> createWithdrawalRequest(
                        @PathVariable String userId,
                        @RequestBody Map<String, Object> request,
                        @AuthenticationPrincipal User mediator) {

                User client = userRepository.findByUserId(userId)
                                .orElseThrow(() -> new RuntimeException("Client not found"));

                // Verify mediator owns this client
                if (client.getMediator() == null || !client.getMediator().getId().equals(mediator.getId())) {
                        return ResponseEntity.status(403)
                                        .body(Map.of("message", "Access Denied: You do not own this client."));
                }

                if (client.getStatus() != com.enterprise.investmentanalytics.model.enums.UserStatus.ACTIVE) {
                        return ResponseEntity.status(403)
                                        .body(Map.of("message", "Operation Denied: Client is not active."));
                }

                java.math.BigDecimal amount = new java.math.BigDecimal(request.get("amount").toString());
                com.enterprise.investmentanalytics.dto.response.WithdrawalRequestDTO dto = withdrawalService.createWithdrawalRequest(client.getId(), amount);
                return ResponseEntity.ok(Map.of(
                                "success", true,
                                "message", "Withdrawal request submitted successfully",
                                "request", dto));
        }

        @PostMapping("/payout-request/{userId}")
        public ResponseEntity<?> createPayoutRequest(
                        @PathVariable String userId,
                        @RequestBody Map<String, Object> request,
                        @AuthenticationPrincipal User mediator) {

                User client = userRepository.findByUserId(userId)
                                .orElseThrow(() -> new RuntimeException("Client not found"));

                if (client.getMediator() == null || !client.getMediator().getId().equals(mediator.getId())) {
                        return ResponseEntity.status(403)
                                        .body(Map.of("message", "Access Denied: You do not own this client."));
                }

                if (client.getStatus() != com.enterprise.investmentanalytics.model.enums.UserStatus.ACTIVE) {
                        return ResponseEntity.status(403)
                                        .body(Map.of("message", "Operation Denied: Client is not active."));
                }

                java.math.BigDecimal amount = new java.math.BigDecimal(request.get("amount").toString());
                String note = (String) request.getOrDefault("note", "");

                return ResponseEntity.ok(payoutRequestService.createRequest(client.getId(), amount, note));
        }

        @PostMapping("/deposit-request/{userId}")
        public ResponseEntity<?> createDepositRequest(
                        @PathVariable String userId,
                        @RequestBody java.util.Map<String, Object> request,
                        @AuthenticationPrincipal User mediator) {

                User user = userRepository.findByUserId(userId)
                                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

                if (user.getMediator() == null || !user.getMediator().getId().equals(mediator.getId())) {
                        throw new RuntimeException("Access Denied: You do not own this client.");
                }

                if (user.getStatus() != com.enterprise.investmentanalytics.model.enums.UserStatus.ACTIVE) {
                        throw new RuntimeException("Operation Denied: Client is not active.");
                }

                java.math.BigDecimal amount = new java.math.BigDecimal(request.get("amount").toString());
                String note = request.getOrDefault("note", "").toString();

                com.enterprise.investmentanalytics.dto.response.DepositRequestDTO depositRequest = depositService
                                .createDepositRequest(user.getId(), amount, null, note);
                return ResponseEntity.ok(java.util.Map.of(
                                "success", true,
                                "message", "Deposit request created successfully",
                                "request", depositRequest));
        }

        @GetMapping("/client/{userId}/deposit-requests")
        public ResponseEntity<List<com.enterprise.investmentanalytics.dto.response.DepositRequestDTO>> getClientDepositRequests(
                        @PathVariable String userId,
                        @AuthenticationPrincipal User mediator) {
                User user = userRepository.findByUserId(userId)
                                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

                if (user.getMediator() == null || !user.getMediator().getId().equals(mediator.getId())) {
                        throw new RuntimeException("Access Denied: You do not own this client.");
                }

                return ResponseEntity.ok(depositService.getUserDepositRequests(user.getId()));
        }

        @GetMapping("/client/{userId}/withdrawal-requests")
        public ResponseEntity<List<com.enterprise.investmentanalytics.dto.response.WithdrawalRequestDTO>> getClientWithdrawalRequests(
                        @PathVariable String userId,
                        @AuthenticationPrincipal User mediator) {
                User user = userRepository.findByUserId(userId)
                                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

                if (user.getMediator() == null || !user.getMediator().getId().equals(mediator.getId())) {
                        throw new RuntimeException("Access Denied: You do not own this client.");
                }

                return ResponseEntity.ok(withdrawalService.getUserWithdrawalRequests(user.getId()));
        }

        @GetMapping("/client/{userId}/transactions")
        public ResponseEntity<List<com.enterprise.investmentanalytics.dto.response.TransactionResponse>> getClientTransactions(
                        @PathVariable String userId,
                        @AuthenticationPrincipal User mediator) {
                User user = userRepository.findByUserId(userId)
                                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

                if (user.getMediator() == null || !user.getMediator().getId().equals(mediator.getId())) {
                        throw new RuntimeException("Access Denied: You do not own this client.");
                }

                return ResponseEntity.ok(transactionService.getTransactionsByUserId(user.getId()));
        }

        @GetMapping("/delete-requests")
        public ResponseEntity<List<com.enterprise.investmentanalytics.dto.response.DeleteRequestDTO>> getMyDeleteRequests(
                        @AuthenticationPrincipal User mediator) {
                return ResponseEntity.ok(deleteRequestService.getRequestsByMediator(mediator.getId()));
        }

        @PostMapping("/clients/{userId}/request-delete")
        public ResponseEntity<?> requestClientDeletion(
                        @PathVariable java.util.UUID userId,
                        @RequestBody java.util.Map<String, String> request,
                        @AuthenticationPrincipal User mediator) {

                String reason = request.getOrDefault("reason", "");
                deleteRequestService.requestClientDeletion(mediator, userId, reason);

                return ResponseEntity.ok(java.util.Map.of("message", "Deletion request submitted successfully"));
        }

        private MediatorClientDTO mapToMediatorClientDTO(User user) {
                return MediatorClientDTO.builder()
                                .id(user.getId())
                                .sequentialId(user.getSequentialId())
                                .userId(user.getUserId())
                                .name(user.getName())
                                .email(user.getEmail())
                                .mobile(user.getMobile())
                                .status(user.getStatus())
                                .createdAt(user.getCreatedAt())
                                .isDeleted(user.isDeleted())
                                .build();
        }

        @PostMapping("/impersonate/{clientId}")
        public ResponseEntity<?> impersonateClient(
                        @PathVariable UUID clientId,
                        @AuthenticationPrincipal User mediator) {

                User client = userRepository.findById(clientId)
                                .orElseThrow(() -> new RuntimeException("Client not found"));

                // Strict Ownership Check
                if (client.getMediator() == null || !client.getMediator().getId().equals(mediator.getId())) {
                        return ResponseEntity.status(403)
                                        .body(Map.of("message",
                                                        "Access Denied: You can only impersonate your own clients."));
                }

                // Reuse existing impersonation logic which returns token
                return ResponseEntity.ok(authenticationService.impersonate(clientId));
        }
}
