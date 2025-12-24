package com.enterprise.investmentanalytics.service;

import com.enterprise.investmentanalytics.dto.response.DashboardMetrics;
import com.enterprise.investmentanalytics.dto.response.TransactionResponse;
import com.enterprise.investmentanalytics.model.entity.User;
import com.enterprise.investmentanalytics.model.enums.TransactionType;

import com.enterprise.investmentanalytics.repository.TransactionRepository;
import com.enterprise.investmentanalytics.repository.PortfolioRepository;
import com.enterprise.investmentanalytics.model.entity.Portfolio;
import java.util.Map;
import java.util.function.Function;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

        private final TransactionRepository transactionRepository;
        private final com.enterprise.investmentanalytics.repository.MonthlyProfitHistoryRepository monthlyProfitHistoryRepository;
        private final MapperService mapperService;
        private final PortfolioRepository portfolioRepository;

        public DashboardMetrics getClientDashboardMetrics(User user) {
                UUID userId = user.getId();

                BigDecimal totalCredit = transactionRepository.sumAmountByUserIdAndType(userId, TransactionType.CREDIT);
                BigDecimal totalDebit = transactionRepository.sumAmountByUserIdAndType(userId, TransactionType.DEBIT);
                BigDecimal totalProfit = transactionRepository.sumAmountByUserIdAndType(userId, TransactionType.PROFIT);

                if (totalCredit == null)
                        totalCredit = BigDecimal.ZERO;
                if (totalDebit == null)
                        totalDebit = BigDecimal.ZERO;
                if (totalProfit == null)
                        totalProfit = BigDecimal.ZERO;

                BigDecimal currentBalance = totalCredit.subtract(totalDebit).add(totalProfit);

                List<TransactionResponse> recentTransactions = transactionRepository
                                .findRecentTransactionsByUserId(userId)
                                .stream()
                                .limit(5)
                                .map(mapperService::toTransactionResponse)
                                .collect(Collectors.toList());

                // Fetch finalized history for the current year
                int currentYear = java.time.LocalDate.now().getYear();
                List<com.enterprise.investmentanalytics.model.entity.MonthlyProfitHistory> history = monthlyProfitHistoryRepository
                                .findByUserIdOrderByYearDescMonthDesc(userId).stream()
                                .filter(h -> h.getYear() == currentYear)
                                .collect(Collectors.toList());

                // Calculate current month profit dynamically (Live view)
                int currentMonth = java.time.LocalDate.now().getMonthValue();
                boolean currentMonthFinalized = history.stream().anyMatch(h -> h.getMonth() == currentMonth);

                List<Object> profitData = new java.util.ArrayList<>();

                // Add finalized history
                profitData.addAll(history.stream()
                                .map(h -> java.util.Map.<String, Object>of(
                                                "name", java.time.Month.of(h.getMonth()).toString().substring(0, 3),
                                                "profit", h.getProfitAmount()))
                                .collect(Collectors.toList()));

                // Add current month if not finalized
                if (!currentMonthFinalized) {
                        java.time.LocalDateTime start = java.time.LocalDate.of(currentYear, currentMonth, 1)
                                        .atStartOfDay();
                        java.time.LocalDateTime end = java.time.LocalDateTime.now();
                        BigDecimal currentMonthProfit = transactionRepository.sumProfitByUserIdAndDateRange(userId,
                                        start, end);
                        if (currentMonthProfit != null && currentMonthProfit.compareTo(BigDecimal.ZERO) > 0) {
                                profitData.add(java.util.Map.of(
                                                "name", java.time.Month.of(currentMonth).toString().substring(0, 3),
                                                "profit", currentMonthProfit));
                        }
                }

                // Sort by month
                profitData.sort((o1, o2) -> {
                        @SuppressWarnings("unchecked")
                        java.util.Map<String, Object> m1 = (java.util.Map<String, Object>) o1;
                        @SuppressWarnings("unchecked")
                        java.util.Map<String, Object> m2 = (java.util.Map<String, Object>) o2;
                        String n1 = (String) m1.get("name");
                        String n2 = (String) m2.get("name");
                        return Integer.compare(monthValue(n1), monthValue(n2));
                });

                return DashboardMetrics.builder()
                                .totalInvested(totalCredit)
                                .totalWithdrawn(totalDebit)
                                .totalProfit(totalProfit)
                                .currentBalance(currentBalance)
                                .recentTransactions(recentTransactions)
                                .monthlyProfitData(profitData)
                                .balanceHistory(java.util.Collections.emptyList())
                                .build();
        }

        public List<com.enterprise.investmentanalytics.dto.response.AdminUserSummary> getAllUserSummaries(
                        List<User> users) {
                List<Portfolio> portfolios = portfolioRepository.findAll();
                Map<UUID, Portfolio> portfolioMap = portfolios.stream()
                                .collect(Collectors.toMap(p -> p.getUser().getId(), Function.identity(),
                                                (p1, p2) -> p1));

                return users.stream().map(user -> {
                        DashboardMetrics metrics = getClientDashboardMetrics(user);
                        Portfolio p = portfolioMap.get(user.getId());

                        return com.enterprise.investmentanalytics.dto.response.AdminUserSummary.builder()
                                        .userId(user.getId())
                                        .name(user.getName())
                                        .email(user.getEmail())
                                        .bankName(user.getBankName())
                                        .accountNumber(user.getAccountNumber())
                                        .totalInvested(metrics.getTotalInvested())
                                        .totalWithdrawn(metrics.getTotalWithdrawn())
                                        .totalProfit(metrics.getTotalProfit())
                                        .currentBalance(metrics.getCurrentBalance())
                                        .profitPercentage(p != null ? p.getProfitPercentage() : null)
                                        .profitStatus(p != null ? p.getProfitAccrualStatus() : null)
                                        .build();
                }).collect(Collectors.toList());
        }

        private int monthValue(String monthName) {
                for (java.time.Month m : java.time.Month.values()) {
                        if (m.toString().substring(0, 3).equals(monthName)) {
                                return m.getValue();
                        }
                }
                return 0;
        }
}
