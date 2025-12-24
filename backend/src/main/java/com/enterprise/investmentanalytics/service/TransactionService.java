package com.enterprise.investmentanalytics.service;

import com.enterprise.investmentanalytics.dto.request.TransactionRequest;
import com.enterprise.investmentanalytics.dto.response.TransactionResponse;
import com.enterprise.investmentanalytics.model.entity.Transaction;
import com.enterprise.investmentanalytics.model.entity.User;
import com.enterprise.investmentanalytics.repository.TransactionRepository;
import com.enterprise.investmentanalytics.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final com.enterprise.investmentanalytics.repository.PortfolioRepository portfolioRepository;
    private final MapperService mapperService;
    private final AuditService auditService;

    @Transactional
    public TransactionResponse createTransaction(TransactionRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Transaction transaction = Transaction.builder()
                .user(user)
                .type(request.getType())
                .amount(request.getAmount())
                .description(request.getDescription())
                .build();

        Transaction savedTransaction = transactionRepository.save(transaction);

        auditService.log("CREATE_TRANSACTION", "TRANSACTION", savedTransaction.getId().toString());

        return mapperService.toTransactionResponse(savedTransaction);
    }

    @Transactional
    public TransactionResponse createPayout(UUID userId, BigDecimal amount, String screenshotPath,
            String messageContent) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        com.enterprise.investmentanalytics.model.entity.Portfolio portfolio = portfolioRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("Portfolio not found"));

        if (portfolio.getAvailableProfit() == null)
            portfolio.setAvailableProfit(BigDecimal.ZERO);
        if (portfolio.getTotalInvested() == null)
            portfolio.setTotalInvested(BigDecimal.ZERO);
        if (portfolio.getTotalValue() == null)
            portfolio.setTotalValue(BigDecimal.ZERO);

        BigDecimal availableProfit = portfolio.getAvailableProfit();
        BigDecimal capitalInvested = portfolio.getTotalInvested();
        BigDecimal amountDeductedFromProfit = BigDecimal.ZERO;
        BigDecimal amountDeductedFromCapital = BigDecimal.ZERO;

        // Deduction Logic
        if (availableProfit.compareTo(amount) >= 0) {
            amountDeductedFromProfit = amount;
            portfolio.setAvailableProfit(availableProfit.subtract(amount));
        } else {
            amountDeductedFromProfit = availableProfit;
            amountDeductedFromCapital = amount.subtract(availableProfit);
            portfolio.setAvailableProfit(BigDecimal.ZERO);
            portfolio.setTotalInvested(capitalInvested.subtract(amountDeductedFromCapital));
        }

        portfolio.setTotalValue(portfolio.getAvailableProfit().add(portfolio.getTotalInvested()));
        portfolioRepository.save(portfolio);

        // Initial save to generate ID
        Transaction transaction = Transaction.builder()
                .user(user)
                .type(com.enterprise.investmentanalytics.model.enums.TransactionType.PAYOUT)
                .amount(amount)
                .description("Payout")
                .screenshotPath(screenshotPath)
                .build();

        Transaction savedTransaction = transactionRepository.save(transaction);

        // Use provided message content or generate if null (fallback, though frontend
        // should provide it)
        String finalMessage = messageContent;
        if (finalMessage == null || finalMessage.isEmpty()) {
            // Fallback generation (simplified for now as frontend should provide the strict
            // format)
            finalMessage = "Payout of ₹" + amount + " processed. Transaction ID: " + savedTransaction.getId();
        } else {
            // Replace placeholder with actual ID if the frontend used a placeholder
            // expected placeholder: TXN_ID_PLACEHOLDER
            finalMessage = finalMessage.replace("TXN_ID_PLACEHOLDER", savedTransaction.getId().toString());
        }

        savedTransaction.setMessageContent(finalMessage);
        savedTransaction = transactionRepository.save(savedTransaction);
        auditService.log("CREATE_PAYOUT", "TRANSACTION", savedTransaction.getId().toString());

        return mapperService.toTransactionResponse(savedTransaction);
    }

    public List<TransactionResponse> getTransactionsByUserId(UUID userId) {
        return transactionRepository.findByUserId(userId).stream()
                .map(mapperService::toTransactionResponse)
                .collect(Collectors.toList());
    }
}
