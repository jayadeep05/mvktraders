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

@RestController
@RequestMapping("/api/mediator")
@RequiredArgsConstructor
public class MediatorController {

        private final UserRepository userRepository;
        private final AuthenticationService authenticationService;
        private final PortfolioService portfolioService;
        private final com.enterprise.investmentanalytics.service.DepositService depositService;
        private final com.enterprise.investmentanalytics.service.WithdrawalService withdrawalService;

        @GetMapping("/clients")
        public ResponseEntity<List<User>> getClients() {
                return ResponseEntity.ok(
                                userRepository.findByRole(com.enterprise.investmentanalytics.model.enums.Role.CLIENT));
        }

        @PostMapping("/client")
        public ResponseEntity<?> createClient(@RequestBody RegisterRequest request,
                        @AuthenticationPrincipal User mediator) {
                authenticationService.registerPending(request, mediator.getEmail());
                return ResponseEntity.ok(java.util.Map.of("message", "Client creation requested successfully"));
        }

        @GetMapping("/portfolios")
        public ResponseEntity<List<AdminClientSummaryDTO>> getPortfolios() {
                return ResponseEntity.ok(portfolioService.getAdminClientSummaries());
        }

        @GetMapping("/pending-users")
        public ResponseEntity<List<User>> getPendingUsers() {
                return ResponseEntity.ok(userRepository.findAll().stream()
                                .filter(u -> u
                                                .getStatus() == com.enterprise.investmentanalytics.model.enums.UserStatus.PENDING_APPROVAL)
                                .toList());
        }

        @PostMapping("/deposit-request/{userId}")
        public ResponseEntity<?> createDepositRequest(
                        @PathVariable String userId,
                        @RequestBody java.util.Map<String, Object> request,
                        @AuthenticationPrincipal User mediator) {

                User user = userRepository.findByUserId(userId)
                                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

                java.math.BigDecimal amount = new java.math.BigDecimal(request.get("amount").toString());
                String note = request
                                .getOrDefault("note", "Deposit request initiated by Mediator " + mediator.getEmail())
                                .toString();

                com.enterprise.investmentanalytics.dto.request.DepositRequestDTO dto = com.enterprise.investmentanalytics.dto.request.DepositRequestDTO
                                .builder()
                                .amount(amount)
                                .note(note)
                                .build();

                com.enterprise.investmentanalytics.model.entity.DepositRequest depositRequest = depositService
                                .createRequest(user.getId(), dto);
                return ResponseEntity.ok(java.util.Map.of(
                                "success", true,
                                "message", "Deposit request created successfully",
                                "request", depositRequest));
        }

        @PostMapping("/withdrawal-request/{userId}")
        public ResponseEntity<?> createWithdrawalRequest(
                        @PathVariable String userId,
                        @RequestBody java.util.Map<String, Object> request,
                        @AuthenticationPrincipal User mediator) {

                User user = userRepository.findByUserId(userId)
                                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

                java.math.BigDecimal amount = new java.math.BigDecimal(request.get("amount").toString());

                com.enterprise.investmentanalytics.dto.response.WithdrawalRequestDTO withdrawalRequest = withdrawalService
                                .createWithdrawalRequest(user.getId(), amount);
                return ResponseEntity.ok(java.util.Map.of(
                                "success", true,
                                "message", "Withdrawal request created successfully",
                                "request", withdrawalRequest));
        }
}
