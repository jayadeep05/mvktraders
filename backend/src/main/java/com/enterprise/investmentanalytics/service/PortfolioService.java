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
                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new RuntimeException("User not found for email: " + email));

                return portfolioRepository.findByUserEmail(email)
                                .orElseGet(() -> {
                                        if (user.getRole() != com.enterprise.investmentanalytics.model.enums.Role.CLIENT) {
                                                throw new RuntimeException(
                                                                "Portfolios are only available for CLIENT users.");
                                        }
                                        return createPortfolioForUser(user, BigDecimal.ZERO);
                                });
        }

        public com.enterprise.investmentanalytics.dto.response.PortfolioDTO getPortfolioDTOByEmail(String email) {
                Portfolio portfolio = getPortfolioByEmail(email);
                return com.enterprise.investmentanalytics.dto.response.PortfolioDTO.builder()
                                .id(portfolio.getId())
                                .totalValue(portfolio.getTotalValue())
                                .totalInvested(portfolio.getTotalInvested())
                                .profitPercentage(portfolio.getProfitPercentage())
                                .profitAccrualStatus(portfolio.getProfitAccrualStatus())
                                .availableProfit(portfolio.getAvailableProfit())
                                .totalProfitEarned(portfolio.getTotalProfitEarned())
                                .updatedAt(portfolio.getUpdatedAt())
                                .build();
        }

        public List<Portfolio> getAllPortfolios() {
                return portfolioRepository.findAll();
        }

        public Portfolio createPortfolioForUser(User user, BigDecimal initialValue, BigDecimal profitPercentage) {
                if (portfolioRepository.findByUserId(user.getId()).isPresent()) {
                        return portfolioRepository.findByUserId(user.getId()).get();
                }
                Portfolio portfolio = Portfolio.builder()
                                .user(user)
                                .totalValue(initialValue)
                                .totalInvested(initialValue)
                                .profitPercentage(profitPercentage)
                                .profitAccrualStatus(
                                                com.enterprise.investmentanalytics.model.enums.ProfitAccrualStatus.ACTIVE)
                                .availableProfit(BigDecimal.ZERO)
                                .totalProfitEarned(BigDecimal.ZERO)
                                .build();
                return portfolioRepository.save(portfolio);
        }

        public Portfolio createPortfolioForUser(User user, BigDecimal initialValue) {
                return createPortfolioForUser(user, initialValue, BigDecimal.ZERO);
        }

        public List<com.enterprise.investmentanalytics.dto.response.AdminClientSummaryDTO> getAdminClientSummaries() {
                // Fetch all clients (users with CLIENT role) to ensure we list everyone, not
                // just those with portfolios
                List<User> clients = userRepository
                                .findByRoleAndIsDeletedFalse(
                                                com.enterprise.investmentanalytics.model.enums.Role.CLIENT);

                // Fetch all portfolios to map them to users
                List<Portfolio> portfolios = portfolioRepository.findAllWithDetails();
                java.util.Map<java.util.UUID, Portfolio> portfolioMap = portfolios.stream()
                                .collect(java.util.stream.Collectors.toMap(p -> p.getUser().getId(),
                                                java.util.function.Function.identity(), (p1, p2) -> p1));

                return clients.stream()
                                .map(client -> createSummaryDTO(client, portfolioMap.get(client.getId())))
                                .sorted((c1, c2) -> c2.getCreatedOn().compareTo(c1.getCreatedOn()))
                                .collect(java.util.stream.Collectors.toList());
        }

        public List<com.enterprise.investmentanalytics.dto.response.AdminClientSummaryDTO> getInactiveClientSummaries() {
                // Fetch all deactivated clients (users with CLIENT role and isDeleted = true)
                List<User> inactiveClients = userRepository
                                .findByRoleAndIsDeletedTrue(com.enterprise.investmentanalytics.model.enums.Role.CLIENT);

                // Fetch all portfolios to map them to users
                List<Portfolio> portfolios = portfolioRepository.findAllWithDetails();
                java.util.Map<java.util.UUID, Portfolio> portfolioMap = portfolios.stream()
                                .collect(java.util.stream.Collectors.toMap(p -> p.getUser().getId(),
                                                java.util.function.Function.identity(), (p1, p2) -> p1));

                return inactiveClients.stream()
                                .map(client -> createSummaryDTO(client, portfolioMap.get(client.getId())))
                                .sorted((c1, c2) -> c2.getCreatedOn().compareTo(c1.getCreatedOn()))
                                .collect(java.util.stream.Collectors.toList());
        }

        public List<com.enterprise.investmentanalytics.dto.response.AdminClientSummaryDTO> getClientSummariesByMediator(
                        java.util.UUID mediatorId) {
                return portfolioRepository.findByUserMediatorId(mediatorId).stream()
                                .map(this::mapToSummaryDTO)
                                .collect(java.util.stream.Collectors.toList());
        }

        private com.enterprise.investmentanalytics.dto.response.AdminClientSummaryDTO mapToSummaryDTO(
                        Portfolio portfolio) {
                if (portfolio.getUser() == null) {
                        return com.enterprise.investmentanalytics.dto.response.AdminClientSummaryDTO.builder()
                                        .email("unknown@deleted")
                                        .clientName("Deleted User")
                                        .status(com.enterprise.investmentanalytics.model.enums.UserStatus.INACTIVE)
                                        .build();
                }
                return createSummaryDTO(portfolio.getUser(), portfolio);
        }

        private com.enterprise.investmentanalytics.dto.response.AdminClientSummaryDTO createSummaryDTO(User user,
                        Portfolio portfolio) {
                // Defaults
                BigDecimal invested = BigDecimal.ZERO;
                BigDecimal availableProfit = BigDecimal.ZERO;
                BigDecimal lifetimeProfit = BigDecimal.ZERO;
                BigDecimal currentBalance = BigDecimal.ZERO;
                Double growth = 0.0;
                BigDecimal profitPercentage = BigDecimal.ZERO;
                com.enterprise.investmentanalytics.model.enums.ProfitAccrualStatus profitStatus = com.enterprise.investmentanalytics.model.enums.ProfitAccrualStatus.ACTIVE;

                if (portfolio != null) {
                        invested = portfolio.getTotalInvested() != null ? portfolio.getTotalInvested()
                                        : BigDecimal.ZERO;
                        availableProfit = portfolio.getAvailableProfit() != null ? portfolio.getAvailableProfit()
                                        : BigDecimal.ZERO;
                        currentBalance = invested.add(availableProfit);
                        lifetimeProfit = portfolio.getTotalProfitEarned() != null ? portfolio.getTotalProfitEarned()
                                        : BigDecimal.ZERO;
                        growth = invested.compareTo(BigDecimal.ZERO) > 0
                                        ? lifetimeProfit.divide(invested, 4, java.math.RoundingMode.HALF_UP)
                                                        .multiply(BigDecimal.valueOf(100))
                                                        .doubleValue()
                                        : 0.0;
                        profitPercentage = portfolio.getProfitPercentage();
                        profitStatus = portfolio.getProfitAccrualStatus();
                }

                return com.enterprise.investmentanalytics.dto.response.AdminClientSummaryDTO.builder()
                                .clientId(user.getId())
                                .clientName(user.getName())
                                .email(user.getEmail())
                                .totalInvested(invested)
                                .currentValue(currentBalance)
                                .profitOrLoss(lifetimeProfit)
                                .availableProfit(availableProfit)
                                .totalProfitEarned(lifetimeProfit)
                                .growthPercentage(growth)
                                .lastUpdated(portfolio != null ? portfolio.getUpdatedAt() : user.getUpdatedAt())
                                .profitPercentage(profitPercentage)
                                .profitStatus(profitStatus)
                                .userId(user.getUserId())
                                .mobile(user.getMobile())
                                .status(user.getStatus())
                                .mediatorName(user.getMediator() != null ? user.getMediator().getName() : "Direct")
                                .mediatorId(user.getMediator() != null ? user.getMediator().getId() : null)
                                .mediatorUserId(user.getMediator() != null ? user.getMediator().getUserId() : null)
                                .createdOn(user.getCreatedAt())
                                .build();
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
                 * .profitPercentage(BigDecimal.ZERO)
                 * .profitAccrualStatus(com.enterprise.investmentanalytics.model.enums.
                 * ProfitAccrualStatus.ACTIVE)
                 * .availableProfit(BigDecimal.ZERO)
                 * .totalProfitEarned(BigDecimal.ZERO)
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
