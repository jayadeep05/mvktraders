package com.enterprise.investmentanalytics.service;

import com.enterprise.investmentanalytics.dto.response.DepositRequestDTO;
import com.enterprise.investmentanalytics.model.entity.DepositRequest;
import com.enterprise.investmentanalytics.model.entity.Portfolio;
import com.enterprise.investmentanalytics.model.entity.Transaction;
import com.enterprise.investmentanalytics.model.entity.User;
import com.enterprise.investmentanalytics.model.enums.RequestStatus;
import com.enterprise.investmentanalytics.model.enums.TransactionType;
import com.enterprise.investmentanalytics.repository.DepositRequestRepository;
import com.enterprise.investmentanalytics.repository.PortfolioRepository;
import com.enterprise.investmentanalytics.repository.TransactionRepository;
import com.enterprise.investmentanalytics.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DepositService {

        private final DepositRequestRepository depositRequestRepository;
        private final UserRepository userRepository;
        private final PortfolioRepository portfolioRepository;
        private final TransactionRepository transactionRepository;
        private final AuditService auditService;

        @Transactional
        public DepositRequestDTO createDepositRequest(UUID userId, BigDecimal amount, String proofImagePath,
                        String userNote) {
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new IllegalArgumentException("User not found"));

                if (user.getStatus() != com.enterprise.investmentanalytics.model.enums.UserStatus.ACTIVE) {
                        throw new IllegalArgumentException("Operation Denied: Client is not active.");
                }

                DepositRequest request = DepositRequest.builder()
                                .user(user)
                                .amount(amount)
                                .proofImagePath(proofImagePath)
                                .userNote(userNote)
                                .status(RequestStatus.PENDING)
                                .build();

                DepositRequest saved = depositRequestRepository.save(request);
                auditService.log("CREATE_DEPOSIT_REQUEST", "CLIENT",
                                "User " + user.getEmail() + " requested deposit of " + amount);

                return toDTO(saved);
        }

        public List<DepositRequestDTO> getAllDepositRequests() {
                return depositRequestRepository.findAllByOrderByCreatedAtDesc().stream()
                                .map(this::toDTO)
                                .collect(Collectors.toList());
        }

        public List<DepositRequestDTO> getPendingDepositRequests() {
                return depositRequestRepository.findByStatusOrderByCreatedAtDesc(RequestStatus.PENDING).stream()
                                .map(this::toDTO)
                                .collect(Collectors.toList());
        }

        public List<DepositRequestDTO> getUserDepositRequests(UUID userId) {
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new IllegalArgumentException("User not found"));
                return depositRequestRepository.findByUserOrderByCreatedAtDesc(user).stream()
                                .map(this::toDTO)
                                .collect(Collectors.toList());
        }

        @Transactional
        public DepositRequestDTO approveDepositRequest(UUID requestId, String adminNote) {
                DepositRequest request = depositRequestRepository.findById(requestId)
                                .orElseThrow(() -> new IllegalArgumentException("Deposit request not found"));

                if (request.getStatus() != RequestStatus.PENDING) {
                        throw new IllegalStateException("Only pending requests can be approved");
                }

                // Update portfolio
                Portfolio portfolio = portfolioRepository.findByUserId(request.getUser().getId())
                                .orElseThrow(() -> new IllegalArgumentException("Portfolio not found"));

                BigDecimal currentInvested = portfolio.getTotalInvested() != null ? portfolio.getTotalInvested()
                                : BigDecimal.ZERO;
                BigDecimal currentValue = portfolio.getTotalValue() != null ? portfolio.getTotalValue()
                                : BigDecimal.ZERO;

                portfolio.setTotalInvested(currentInvested.add(request.getAmount()));
                portfolio.setTotalValue(currentValue.add(request.getAmount()));
                portfolioRepository.save(portfolio);

                // Create transaction
                Transaction transaction = Transaction.builder()
                                .user(request.getUser())
                                .type(TransactionType.DEPOSIT)
                                .amount(request.getAmount())
                                .description("Deposit approved - " + (adminNote != null ? adminNote : ""))
                                .screenshotPath(request.getProofImagePath())
                                .build();
                transactionRepository.save(transaction);

                // Update request status
                request.setStatus(RequestStatus.APPROVED);
                request.setAdminNote(adminNote);
                DepositRequest updated = depositRequestRepository.save(request);

                auditService.log("APPROVE_DEPOSIT", "ADMIN",
                                "Approved deposit request " + requestId + " for amount " + request.getAmount());

                return toDTO(updated);
        }

        @Transactional
        public DepositRequestDTO rejectDepositRequest(UUID requestId, String reason) {
                DepositRequest request = depositRequestRepository.findById(requestId)
                                .orElseThrow(() -> new IllegalArgumentException("Deposit request not found"));

                if (request.getStatus() != RequestStatus.PENDING) {
                        throw new IllegalStateException("Only pending requests can be rejected");
                }

                request.setStatus(RequestStatus.REJECTED);
                request.setAdminNote(reason);
                DepositRequest updated = depositRequestRepository.save(request);

                auditService.log("REJECT_DEPOSIT", "ADMIN",
                                "Rejected deposit request " + requestId + " - Reason: " + reason);

                return toDTO(updated);
        }

        private DepositRequestDTO toDTO(DepositRequest request) {
                User user = request.getUser();
                return DepositRequestDTO.builder()
                                .id(request.getId())
                                .userId(user != null ? user.getId() : null)
                                .userIdString(user != null ? user.getUserId() : null) // Business ID like MVK001
                                .userName(user != null ? user.getName() : "Unknown User")
                                .userEmail(user != null ? user.getEmail() : "No Email")
                                .amount(request.getAmount())
                                .proofImagePath(request.getProofImagePath())
                                .userNote(request.getUserNote())
                                .adminNote(request.getAdminNote())
                                .status(request.getStatus())
                                .createdAt(request.getCreatedAt())
                                .updatedAt(request.getUpdatedAt())
                                .build();
        }
}
