package com.enterprise.investmentanalytics.service;

import com.enterprise.investmentanalytics.dto.response.WithdrawalRequestDTO;
import com.enterprise.investmentanalytics.model.entity.Portfolio;
import com.enterprise.investmentanalytics.model.entity.User;
import com.enterprise.investmentanalytics.model.entity.WithdrawalRequest;
import com.enterprise.investmentanalytics.model.enums.WithdrawalStatus;
import com.enterprise.investmentanalytics.repository.PortfolioRepository;
import com.enterprise.investmentanalytics.repository.UserRepository;
import com.enterprise.investmentanalytics.repository.WithdrawalRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WithdrawalService {

    private final WithdrawalRequestRepository withdrawalRequestRepository;
    private final UserRepository userRepository;
    private final PortfolioRepository portfolioRepository;

    @Transactional
    public WithdrawalRequestDTO createWithdrawalRequest(UUID userId, BigDecimal amount) {
        // Validate user exists and is active
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getStatus() != com.enterprise.investmentanalytics.model.enums.UserStatus.ACTIVE) {
            throw new RuntimeException("User account is not active");
        }

        // Validate amount
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Withdrawal amount must be greater than zero");
        }

        // Get user's portfolio and validate balance
        Portfolio portfolio = portfolioRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Portfolio not found for user"));

        if (portfolio.getTotalValue() == null || portfolio.getTotalValue().compareTo(amount) < 0) {
            throw new RuntimeException("Insufficient balance. Available: " +
                    (portfolio.getTotalValue() != null ? portfolio.getTotalValue() : BigDecimal.ZERO));
        }

        // Create withdrawal request
        WithdrawalRequest request = WithdrawalRequest.builder()
                .user(user)
                .amount(amount)
                .status(WithdrawalStatus.PENDING)
                .build();

        request = withdrawalRequestRepository.save(request);

        return mapToDTO(request);
    }

    public List<WithdrawalRequestDTO> getUserWithdrawalRequests(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<WithdrawalRequest> requests = withdrawalRequestRepository.findByUserOrderByCreatedAtDesc(user);
        return requests.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    public List<WithdrawalRequestDTO> getAllWithdrawalRequests() {
        List<WithdrawalRequest> requests = withdrawalRequestRepository.findAllByOrderByCreatedAtDesc();
        return requests.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    public List<WithdrawalRequestDTO> getWithdrawalRequestsByStatus(WithdrawalStatus status) {
        List<WithdrawalRequest> requests = withdrawalRequestRepository.findByStatusOrderByCreatedAtDesc(status);
        return requests.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Transactional
    public WithdrawalRequestDTO approveWithdrawalRequest(UUID requestId, String adminId, String paymentMode) {
        WithdrawalRequest request = withdrawalRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Withdrawal request not found"));

        // Validate request is pending
        if (request.getStatus() != WithdrawalStatus.PENDING) {
            throw new RuntimeException("Only pending requests can be approved. Current status: " + request.getStatus());
        }

        // Get portfolio and validate balance again (in case it changed)
        Portfolio portfolio = portfolioRepository.findByUserId(request.getUser().getId())
                .orElseThrow(() -> new RuntimeException("Portfolio not found"));

        if (portfolio.getTotalValue() == null || portfolio.getTotalValue().compareTo(request.getAmount()) < 0) {
            throw new RuntimeException("Insufficient balance for withdrawal");
        }

        // Deduct amount from total invested (assuming capital withdrawal)
        if (portfolio.getTotalInvested() != null) {
            portfolio.setTotalInvested(portfolio.getTotalInvested().subtract(request.getAmount()));
        }

        // Also deduct from total value
        if (portfolio.getTotalValue() != null) {
            portfolio.setTotalValue(portfolio.getTotalValue().subtract(request.getAmount()));
        }

        portfolioRepository.save(portfolio);

        // Update request status
        request.setStatus(WithdrawalStatus.APPROVED);
        request.setProcessedBy(adminId);
        request.setPaymentMode(paymentMode);
        request.setProcessedAt(LocalDateTime.now());

        request = withdrawalRequestRepository.save(request);

        return mapToDTO(request);
    }

    @Transactional
    public WithdrawalRequestDTO rejectWithdrawalRequest(UUID requestId, String adminId, String reason) {
        WithdrawalRequest request = withdrawalRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Withdrawal request not found"));

        // Validate request is pending
        if (request.getStatus() != WithdrawalStatus.PENDING) {
            throw new RuntimeException("Only pending requests can be rejected. Current status: " + request.getStatus());
        }

        // Update request status
        request.setStatus(WithdrawalStatus.REJECTED);
        request.setRejectionReason(reason);
        request.setProcessedBy(adminId);
        request.setProcessedAt(LocalDateTime.now());

        request = withdrawalRequestRepository.save(request);

        return mapToDTO(request);
    }

    private WithdrawalRequestDTO mapToDTO(WithdrawalRequest request) {
        return WithdrawalRequestDTO.builder()
                .id(request.getId())
                .userId(request.getUser().getUserId())
                .userName(request.getUser().getName())
                .userEmail(request.getUser().getEmail())
                .amount(request.getAmount())
                .status(request.getStatus())
                .rejectionReason(request.getRejectionReason())
                .createdAt(request.getCreatedAt())
                .processedAt(request.getProcessedAt())
                .build();
    }
}
