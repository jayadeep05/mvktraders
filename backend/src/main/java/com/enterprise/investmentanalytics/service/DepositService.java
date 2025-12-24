package com.enterprise.investmentanalytics.service;

import com.enterprise.investmentanalytics.dto.request.DepositRequestDTO;
import com.enterprise.investmentanalytics.model.entity.*;
import com.enterprise.investmentanalytics.model.enums.DepositStatus;
import com.enterprise.investmentanalytics.model.enums.TransactionType;
import com.enterprise.investmentanalytics.repository.DepositRequestRepository;
import com.enterprise.investmentanalytics.repository.PortfolioRepository;
import com.enterprise.investmentanalytics.repository.TransactionRepository;
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
public class DepositService {

    private final DepositRequestRepository depositRequestRepository;
    private final UserRepository userRepository;
    private final PortfolioRepository portfolioRepository;
    private final TransactionRepository transactionRepository;

    @Transactional
    public DepositRequest createRequest(UUID userId, DepositRequestDTO dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (dto.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Amount must be greater than 0");
        }

        DepositRequest request = DepositRequest.builder()
                .user(user)
                .amount(dto.getAmount())
                .status(DepositStatus.PENDING)
                .note(dto.getNote())
                .build();

        return depositRequestRepository.save(request);
    }

    public List<DepositRequest> getRequestsByUser(UUID userId) {
        return depositRequestRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<DepositRequest> getAllRequests() {
        return depositRequestRepository.findAll(org.springframework.data.domain.Sort
                .by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt"));
    }

    public List<DepositRequest> getRequestsByStatus(DepositStatus status) {
        return depositRequestRepository.findByStatusOrderByCreatedAtDesc(status);
    }

    @Transactional
    public DepositRequest approveRequest(UUID requestId, String adminId, String paymentMode) {
        DepositRequest request = depositRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        if (request.getStatus() != DepositStatus.PENDING) {
            throw new RuntimeException("Request is not in PENDING state");
        }

        request.setStatus(DepositStatus.APPROVED);
        request.setProcessedBy(adminId);
        request.setPaymentMode(paymentMode);
        request.setProcessedAt(LocalDateTime.now());

        // Update Portfolio
        Portfolio portfolio = portfolioRepository.findByUserId(request.getUser().getId())
                .orElseThrow(() -> new RuntimeException("Portfolio not found for user"));

        // Add to total invested and total value (also affects cash balance if we track
        // it properly, assuming investment = cash balance here for simplicity or
        // strictly investment)
        // Based on user req: "Add the requested amount to the client’s current
        // investment balance."
        BigDecimal currentInvested = portfolio.getTotalInvested() != null ? portfolio.getTotalInvested()
                : BigDecimal.ZERO;
        BigDecimal currentValue = portfolio.getTotalValue() != null ? portfolio.getTotalValue() : BigDecimal.ZERO;

        portfolio.setTotalInvested(currentInvested.add(request.getAmount()));
        portfolio.setTotalValue(currentValue.add(request.getAmount()));

        portfolioRepository.save(portfolio);

        // Create Transaction Record
        Transaction transaction = Transaction.builder()
                .user(request.getUser())
                .amount(request.getAmount())
                .type(TransactionType.CREDIT)
                .description("Deposit Approved: " + (request.getNote() != null ? request.getNote() : ""))
                .build();
        transactionRepository.save(transaction);

        return depositRequestRepository.save(request);
    }

    @Transactional
    public DepositRequest rejectRequest(UUID requestId, String adminId) {
        DepositRequest request = depositRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        if (request.getStatus() != DepositStatus.PENDING) {
            throw new RuntimeException("Request is not in PENDING state");
        }

        request.setStatus(DepositStatus.REJECTED);
        request.setProcessedBy(adminId);
        request.setProcessedAt(LocalDateTime.now());

        return depositRequestRepository.save(request);
    }
}
