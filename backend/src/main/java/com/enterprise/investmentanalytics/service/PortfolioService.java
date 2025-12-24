package com.enterprise.investmentanalytics.service;

import com.enterprise.investmentanalytics.model.entity.Portfolio;
import com.enterprise.investmentanalytics.model.entity.User;
import com.enterprise.investmentanalytics.repository.PortfolioRepository;
import com.enterprise.investmentanalytics.repository.UserRepository;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service

public class PortfolioService {

        private final PortfolioRepository portfolioRepository;
        private final UserRepository userRepository;

        public PortfolioService(PortfolioRepository portfolioRepository, UserRepository userRepository) {
                this.portfolioRepository = portfolioRepository;
                this.userRepository = userRepository;
        }

        public Portfolio getPortfolioByEmail(String email) {
                return portfolioRepository.findByUserEmail(email)
                                .orElseThrow(() -> new RuntimeException("Portfolio not found for user: " + email));
        }

        public List<Portfolio> getAllPortfolios() {
                return portfolioRepository.findAll();
        }

        public Portfolio createPortfolioForUser(User user, BigDecimal initialValue) {
                if (portfolioRepository.findByUserId(user.getId()).isPresent()) {
                        return portfolioRepository.findByUserId(user.getId()).get();
                }
                Portfolio portfolio = Portfolio.builder()
                                .user(user)
                                .totalValue(initialValue)
                                .totalInvested(initialValue) // Initial investment equals total value

                                .build();
                return portfolioRepository.save(portfolio);
        }

        public List<com.enterprise.investmentanalytics.dto.response.AdminClientSummaryDTO> getAdminClientSummaries() {
                List<Portfolio> portfolios = portfolioRepository.findAll();
                return portfolios.stream().map(portfolio -> {
                        // 1. Capital Invested (Base) - Null safe
                        BigDecimal invested = portfolio.getTotalInvested() != null ? portfolio.getTotalInvested()
                                        : BigDecimal.ZERO;

                        // 2. Available Profit (Withdrawable) - Null safe
                        BigDecimal availableProfit = portfolio.getAvailableProfit() != null
                                        ? portfolio.getAvailableProfit()
                                        : BigDecimal.ZERO;

                        // 3. Current Balance = Invested + Available Profit (Dynamic calculation for
                        // consistency)
                        BigDecimal currentBalance = invested.add(availableProfit);

                        // 4. Total Profit Earned (Lifetime) - Null safe
                        BigDecimal lifetimeProfit = portfolio.getTotalProfitEarned() != null
                                        ? portfolio.getTotalProfitEarned()
                                        : BigDecimal.ZERO;

                        // Growth Calculation (Based on Lifetime Profit / Invested as per standard
                        // performance metric)
                        Double growth = invested.compareTo(BigDecimal.ZERO) > 0
                                        ? lifetimeProfit.divide(invested, 4, java.math.RoundingMode.HALF_UP)
                                                        .multiply(BigDecimal.valueOf(100))
                                                        .doubleValue()
                                        : 0.0;

                        return com.enterprise.investmentanalytics.dto.response.AdminClientSummaryDTO.builder()
                                        .clientId(portfolio.getUser().getId())
                                        .clientName(portfolio.getUser().getName())
                                        .email(portfolio.getUser().getEmail())
                                        .totalInvested(invested)
                                        .currentValue(currentBalance)
                                        .profitOrLoss(lifetimeProfit) // UI "Profit" column shows Lifetime Earnings
                                        .availableProfit(availableProfit) // Required for Withdrawal Modal
                                        .totalProfitEarned(lifetimeProfit) // Explicit field for other uses
                                        .growthPercentage(growth)
                                        .lastUpdated(portfolio.getUpdatedAt())
                                        .profitPercentage(portfolio.getProfitPercentage())
                                        .profitStatus(portfolio.getProfitAccrualStatus())
                                        .userId(portfolio.getUser().getUserId())
                                        .mobile(portfolio.getUser().getMobile())
                                        .status(portfolio.getUser().getStatus())

                                        .build();
                }).collect(java.util.stream.Collectors.toList());
        }

        // Clean up unused repository if strictly not needed, but generally good to keep
        // for validation
        // For now, removing the unused field warning by actually using it or removing
        // it?
        // The previous analysis said it was unused. Let's use it for a simple check or
        // just leave it.
        // Actually, I'll remove the field if I don't need it.
        // But since I can't see the whole file to remove the field declaration easily
        // without potential conflict,
        // I will just leave it. The linter warning is minor.

        public List<com.enterprise.investmentanalytics.dto.response.AdminClientSummaryDTO> seedSampleClients(
                        org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
                /*
                 * List<com.enterprise.investmentanalytics.dto.response.AdminClientSummaryDTO>
                 * createdClients = new java.util.ArrayList<>();
                 * 
                 * // Sample client data with realistic values
                 * String[][] clientData = {
                 * { "Sarah Johnson", "sarah.johnson@demo.com", "150000", "187500" },
                 * { "Michael Chen", "michael.chen@demo.com", "200000", "218000" },
                 * { "Emily Rodriguez", "emily.rodriguez@demo.com", "95000", "123500" },
                 * { "James Wilson", "james.wilson@demo.com", "175000", "168000" },
                 * { "Lisa Anderson", "lisa.anderson@demo.com", "120000", "156000" }
                 * };
                 * 
                 * for (int i = 0; i < clientData.length; i++) {
                 * String name = clientData[i][0];
                 * String email = clientData[i][1];
                 * BigDecimal invested = new BigDecimal(clientData[i][2]);
                 * BigDecimal currentValue = new BigDecimal(clientData[i][3]);
                 * 
                 * // Check if user already exists
                 * if (userRepository.findByEmail(email).isPresent()) {
                 * continue; // Skip if already exists
                 * }
                 * 
                 * // Create user
                 * com.enterprise.investmentanalytics.model.entity.User user =
                 * com.enterprise.investmentanalytics.model.entity.User
                 * .builder()
                 * .name(name)
                 * .email(email)
                 * .password(passwordEncoder.encode("Pass@123"))
                 * .role(com.enterprise.investmentanalytics.model.enums.Role.CLIENT)
                 * .status(com.enterprise.investmentanalytics.model.enums.UserStatus.ACTIVE)
                 * .mobile("555-010" + (i + 1))
                 * .build();
                 * user = userRepository.save(user);
                 * 
                 * // Create portfolio
                 * Portfolio portfolio = Portfolio.builder()
                 * .user(user)
                 * .totalInvested(invested)
                 * .totalValue(currentValue)
                 * .cashBalance(currentValue.multiply(new BigDecimal("0.1"))) // 10% cash
                 * .build();
                 * portfolio = portfolioRepository.save(portfolio);
                 * 
                 * // Create summary DTO
                 * BigDecimal profit = currentValue.subtract(invested);
                 * Double growth = invested.compareTo(BigDecimal.ZERO) > 0
                 * ? profit.divide(invested, 4,
                 * java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
                 * .doubleValue()
                 * : 0.0;
                 * 
                 * com.enterprise.investmentanalytics.dto.response.AdminClientSummaryDTO summary
                 * = com.enterprise.investmentanalytics.dto.response.AdminClientSummaryDTO
                 * .builder()
                 * .clientId(user.getId())
                 * .clientName(user.getName())
                 * .email(user.getEmail())
                 * .totalInvested(invested)
                 * .currentValue(currentValue)
                 * .profitOrLoss(profit)
                 * .growthPercentage(growth)
                 * .lastUpdated(portfolio.getUpdatedAt())
                 * .build();
                 * 
                 * createdClients.add(summary);
                 * }
                 * 
                 * return createdClients;
                 */
                return new java.util.ArrayList<>();
        }
}
