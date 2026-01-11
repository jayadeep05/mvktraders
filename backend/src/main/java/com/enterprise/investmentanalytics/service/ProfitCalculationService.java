package com.enterprise.investmentanalytics.service;

import com.enterprise.investmentanalytics.model.entity.MonthlyProfitHistory;
import com.enterprise.investmentanalytics.model.entity.Portfolio;
import com.enterprise.investmentanalytics.model.entity.Transaction;
import com.enterprise.investmentanalytics.model.entity.User;
import com.enterprise.investmentanalytics.model.enums.ProfitMode;
import com.enterprise.investmentanalytics.model.enums.Role;
import com.enterprise.investmentanalytics.model.enums.TransactionType;
import com.enterprise.investmentanalytics.model.enums.UserStatus;
import com.enterprise.investmentanalytics.repository.MonthlyProfitHistoryRepository;
import com.enterprise.investmentanalytics.repository.PortfolioRepository;
import com.enterprise.investmentanalytics.repository.TransactionRepository;
import com.enterprise.investmentanalytics.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProfitCalculationService {

    private final UserRepository userRepository;
    private final PortfolioRepository portfolioRepository;
    private final MonthlyProfitHistoryRepository profitHistoryRepository;
    private final TransactionRepository transactionRepository;
    private final GlobalConfigService configService;

    @Transactional
    public void calculateMonthlyProfit(int month, int year) {
        log.info("Starting profit calculation for {}/{}", month, year);

        // 1. Fetch Configuration
        BigDecimal fixedRate = configService.getBigDecimal(GlobalConfigService.FIXED_MONTHLY_RATE_PERCENT)
                .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        BigDecimal compoundingRate = configService.getBigDecimal(GlobalConfigService.COMPOUNDING_MONTHLY_RATE_PERCENT)
                .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        boolean useProration = configService.getBoolean(GlobalConfigService.USE_FIRST_MONTH_PRORATION);
        String prorationMethod = configService.getValue(GlobalConfigService.FIRST_MONTH_PRORATION_METHOD);
        int cutoffDay = configService.getInt(GlobalConfigService.MONTHLY_CUTOFF_DAY);
        boolean useAdminApprovalDate = configService
                .getBoolean(GlobalConfigService.USE_ADMIN_APPROVAL_DATE_AS_ENTRY_DATE);

        YearMonth cycleMonth = YearMonth.of(year, month);
        int daysInMonth = cycleMonth.lengthOfMonth();

        // 2. Fetch Active Clients
        List<User> activeClients = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.CLIENT && u.getStatus() == UserStatus.ACTIVE && !u.isDeleted())
                .toList();

        for (User user : activeClients) {
            try {
                processClientProfit(user, cycleMonth, fixedRate, compoundingRate, useProration, prorationMethod,
                        cutoffDay, useAdminApprovalDate, daysInMonth);
            } catch (Exception e) {
                log.error("Failed to calculate profit for user {}: {}", user.getEmail(), e.getMessage(), e);
            }
        }

        log.info("Completed profit calculation for {}/{}", month, year);
    }

    private void processClientProfit(User user, YearMonth cycleMonth, BigDecimal fixedRate, BigDecimal compoundingRate,
            boolean useProration, String prorationMethod, int cutoffDay, boolean useAdminApprovalDate,
            int daysInMonth) {
        // Idempotency Check
        if (profitHistoryRepository
                .findByUserIdAndMonthAndYear(user.getId(), cycleMonth.getMonthValue(), cycleMonth.getYear())
                .isPresent()) {
            log.info("Profit already calculated for user {} for {}/{}", user.getEmail(), cycleMonth.getMonthValue(),
                    cycleMonth.getYear());
            return;
        }

        Portfolio portfolio = portfolioRepository.findByUserId(user.getId()).orElse(null);
        if (portfolio == null || portfolio.getTotalInvested().compareTo(BigDecimal.ZERO) <= 0) {
            return; // Nothing to calculate
        }

        // Determine Entry Date
        LocalDate entryDate = (useAdminApprovalDate && user.getApprovedAt() != null)
                ? user.getApprovedAt().toLocalDate()
                : user.getCreatedAt().toLocalDate();

        // Check Eligibility (Is this the first month?)
        boolean isFirstMonth = (entryDate.getYear() == cycleMonth.getYear()
                && entryDate.getMonth() == cycleMonth.getMonth());

        // If entry date is in FUTURE of cycle month (shouldn't happen if batch runs
        // correctly, but for safety)
        if (entryDate.isAfter(cycleMonth.atEndOfMonth())) {
            return;
        }

        BigDecimal eligibleCapital = portfolio.getTotalInvested();
        BigDecimal applicableRate = (portfolio.getProfitMode() == ProfitMode.COMPOUNDING) ? compoundingRate : fixedRate;
        BigDecimal fraction = BigDecimal.ONE;
        boolean isProrated = false;

        if (isFirstMonth) {
            if (useProration) {
                isProrated = true;
                int activeDays = daysInMonth - entryDate.getDayOfMonth() + 1;
                if (activeDays < 0)
                    activeDays = 0; // Should not happen

                if ("SLAB_BASED".equalsIgnoreCase(prorationMethod)) {
                    // Example Slab Logic (1-10 -> 100%, 11-20 -> 66%, 21+ -> 33%)
                    // Implementation as per spec example
                    int day = entryDate.getDayOfMonth();
                    if (day <= 10)
                        fraction = BigDecimal.ONE;
                    else if (day <= 20)
                        fraction = new BigDecimal("0.66");
                    else
                        fraction = new BigDecimal("0.33");
                } else {
                    // DAY_BASED
                    fraction = BigDecimal.valueOf(activeDays).divide(BigDecimal.valueOf(daysInMonth), 4,
                            RoundingMode.HALF_UP);
                }
            } else {
                // Cutoff Logic
                if (entryDate.getDayOfMonth() > cutoffDay) {
                    log.info("User {} joined after cutoff {} in first month, skipping profit.", user.getEmail(),
                            cutoffDay);
                    return; // No profit this month
                }
            }
        }

        BigDecimal profitAmount = eligibleCapital.multiply(applicableRate).multiply(fraction).setScale(2,
                RoundingMode.HALF_UP);
        BigDecimal openingBalance = portfolio.getTotalInvested()
                .add(Optional.ofNullable(portfolio.getAvailableProfit()).orElse(BigDecimal.ZERO));

        // Apply Profit logic
        // "First-month profit is never compounded... Compounding starts only from the
        // first full month."
        boolean shouldCompound = (portfolio.getProfitMode() == ProfitMode.COMPOUNDING) && !isFirstMonth;

        if (shouldCompound) {
            portfolio.setTotalInvested(portfolio.getTotalInvested().add(profitAmount));
        } else {
            BigDecimal currentAvailable = Optional.ofNullable(portfolio.getAvailableProfit()).orElse(BigDecimal.ZERO);
            portfolio.setAvailableProfit(currentAvailable.add(profitAmount));
        }

        // Update Total Value (Invested + Available)
        // Wait, Total Value = Invested + Available?
        // Let's check Portfolio.java definition. totalValue field exists.
        // Usually Total Value = Invested + Available Profit.
        BigDecimal newInvested = portfolio.getTotalInvested();
        BigDecimal newAvailable = Optional.ofNullable(portfolio.getAvailableProfit()).orElse(BigDecimal.ZERO);
        portfolio.setTotalValue(newInvested.add(newAvailable));
        portfolio.setTotalProfitEarned(
                Optional.ofNullable(portfolio.getTotalProfitEarned()).orElse(BigDecimal.ZERO).add(profitAmount));

        portfolioRepository.save(portfolio);

        // Record History
        MonthlyProfitHistory history = MonthlyProfitHistory.builder()
                .user(user)
                .month(cycleMonth.getMonthValue())
                .year(cycleMonth.getYear())
                .openingBalance(openingBalance) // Not exact Definition of opening balance (Value vs invested), using
                                                // Value here.
                .profitPercentage(applicableRate.multiply(BigDecimal.valueOf(100))) // Storing as percentage e.g. 4.0
                .profitAmount(profitAmount)
                .closingBalance(portfolio.getTotalValue())
                .isManual(false)
                .eligibleCapital(eligibleCapital) // NEW FIELD
                .profitMode(portfolio.getProfitMode().name()) // NEW FIELD
                .isProrated(isProrated) // NEW FIELD
                .build();

        profitHistoryRepository.save(history);

        // Record Transaction
        Transaction txn = Transaction.builder()
                .user(user)
                .type(TransactionType.PROFIT)
                .amount(profitAmount)
                .description(String.format("Profit for %s (Mode: %s%s)", cycleMonth, portfolio.getProfitMode(),
                        isProrated ? ", Prorated" : ""))
                .build();
        transactionRepository.save(txn);

        log.info("Calculated profit for user {}: {}", user.getEmail(), profitAmount);
    }
}
