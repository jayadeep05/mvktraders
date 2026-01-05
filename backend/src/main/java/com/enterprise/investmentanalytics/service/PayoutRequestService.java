package com.enterprise.investmentanalytics.service;

import com.enterprise.investmentanalytics.dto.response.PayoutRequestDTO;
import com.enterprise.investmentanalytics.model.entity.PayoutRequest;
import com.enterprise.investmentanalytics.model.entity.Portfolio;
import com.enterprise.investmentanalytics.model.entity.User;
import com.enterprise.investmentanalytics.model.enums.UserStatus;
import com.enterprise.investmentanalytics.model.enums.WithdrawalStatus;
import com.enterprise.investmentanalytics.repository.PayoutRequestRepository;
import com.enterprise.investmentanalytics.repository.PortfolioRepository;
import com.enterprise.investmentanalytics.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PayoutRequestService {

    private final PayoutRequestRepository payoutRequestRepository;
    private final UserRepository userRepository;
    private final PortfolioRepository portfolioRepository;
    private final com.enterprise.investmentanalytics.repository.TransactionRepository transactionRepository;

    @Transactional
    public PayoutRequestDTO createRequest(UUID userId, BigDecimal amount, String note) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new RuntimeException("User account is not active");
        }

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Amount must be greater than zero");
        }

        Portfolio portfolio = portfolioRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Portfolio not found"));

        // Note: We're creating a REQUEST, not executing the payout
        // The actual profit validation will happen when admin approves
        // For now, just log a warning if profit seems insufficient
        if (portfolio.getAvailableProfit() == null || portfolio.getAvailableProfit().compareTo(amount) < 0) {
            // Allow the request but it will need admin review
            System.out.println("Warning: Payout request amount exceeds available profit for user " + userId);
        }

        PayoutRequest request = PayoutRequest.builder()
                .user(user)
                .amount(amount)
                .note(note)
                .status(WithdrawalStatus.PENDING)
                .build();

        request = payoutRequestRepository.save(request);
        return mapToDTO(request);
    }

    public List<PayoutRequestDTO> getAllRequests() {
        return payoutRequestRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToDTO)
                .collect(java.util.stream.Collectors.toList());
    }

    public List<PayoutRequestDTO> getRequestsByStatus(WithdrawalStatus status) {
        return payoutRequestRepository.findByStatusOrderByCreatedAtDesc(status)
                .stream()
                .map(this::mapToDTO)
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public PayoutRequestDTO approveRequest(UUID requestId, String adminUsername) {
        PayoutRequest request = payoutRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        if (request.getStatus() != WithdrawalStatus.PENDING) {
            throw new RuntimeException("Request is not pending");
        }

        // Check profit again
        Portfolio portfolio = portfolioRepository.findByUserId(request.getUser().getId())
                .orElseThrow(() -> new RuntimeException("Portfolio not found"));

        BigDecimal availableProfit = portfolio.getAvailableProfit() != null ? portfolio.getAvailableProfit()
                : BigDecimal.ZERO;
        BigDecimal totalValue = portfolio.getTotalValue() != null ? portfolio.getTotalValue() : BigDecimal.ZERO;
        BigDecimal totalInvested = portfolio.getTotalInvested() != null ? portfolio.getTotalInvested()
                : BigDecimal.ZERO;
        BigDecimal payoutAmount = request.getAmount();

        // Check if total value is sufficient
        if (totalValue.compareTo(payoutAmount) < 0) {
            throw new RuntimeException(
                    "Insufficient funds. Total value: ₹" + totalValue + ", Requested: ₹" + payoutAmount);
        }

        // Deduct from profit first, then from investment if needed
        BigDecimal newAvailableProfit;
        BigDecimal newTotalInvested;

        if (availableProfit.compareTo(payoutAmount) >= 0) {
            // Sufficient profit available
            newAvailableProfit = availableProfit.subtract(payoutAmount);
            newTotalInvested = totalInvested;
        } else {
            // Need to deduct from both profit and investment
            BigDecimal remainder = payoutAmount.subtract(availableProfit);
            newAvailableProfit = BigDecimal.ZERO;
            newTotalInvested = totalInvested.subtract(remainder);
        }

        // Update portfolio
        portfolio.setAvailableProfit(newAvailableProfit);
        portfolio.setTotalInvested(newTotalInvested);
        portfolio.setTotalValue(newAvailableProfit.add(newTotalInvested));
        portfolioRepository.save(portfolio);

        // Create Transaction record for history
        try {
            com.enterprise.investmentanalytics.model.entity.Transaction transaction = com.enterprise.investmentanalytics.model.entity.Transaction
                    .builder()
                    .user(request.getUser())
                    .type(com.enterprise.investmentanalytics.model.enums.TransactionType.PAYOUT)
                    .amount(payoutAmount)
                    .description("Payout approved by " + adminUsername
                            + (request.getNote() != null ? " - " + request.getNote() : ""))
                    .build();
            transaction = transactionRepository.save(transaction);

            // Store transaction reference in payout request
            request.setTransactionIdReference(transaction.getId().toString());
        } catch (Exception e) {
            System.err.println("Failed to create transaction record: " + e.getMessage());
            // Continue anyway - the payout is already processed
        }

        // Mark request as approved
        request.setStatus(WithdrawalStatus.APPROVED);
        request.setProcessedBy(adminUsername);
        request.setProcessedAt(LocalDateTime.now());

        request = payoutRequestRepository.save(request);
        return mapToDTO(request);
    }

    @Transactional
    public PayoutRequestDTO rejectRequest(UUID requestId, String adminUsername, String reason) {
        PayoutRequest request = payoutRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        if (request.getStatus() != WithdrawalStatus.PENDING) {
            throw new RuntimeException("Request is not pending");
        }

        request.setStatus(WithdrawalStatus.REJECTED);
        request.setRejectionReason(reason);
        request.setProcessedBy(adminUsername);
        request.setProcessedAt(LocalDateTime.now());

        request = payoutRequestRepository.save(request);
        return mapToDTO(request);
    }

    private PayoutRequestDTO mapToDTO(PayoutRequest request) {
        return PayoutRequestDTO.builder()
                .id(request.getId())
                .userId(request.getUser().getUserId())
                .userName(request.getUser().getName())
                .userEmail(request.getUser().getEmail())
                .amount(request.getAmount())
                .note(request.getNote())
                .status(request.getStatus())
                .rejectionReason(request.getRejectionReason())
                .processedBy(request.getProcessedBy())
                .createdAt(request.getCreatedAt())
                .processedAt(request.getProcessedAt())
                .build();
    }
}
