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
        private final GlobalConfigService globalConfigService;

        public PortfolioService(PortfolioRepository portfolioRepository, UserRepository userRepository,
                        GlobalConfigService globalConfigService) {
                this.portfolioRepository = portfolioRepository;
                this.userRepository = userRepository;
                this.globalConfigService = globalConfigService;
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
                com.enterprise.investmentanalytics.dto.response.PortfolioDTO portfolioDTO = com.enterprise.investmentanalytics.dto.response.PortfolioDTO
                                .builder()
                                .id(portfolio.getId())
                                .totalValue(portfolio.getTotalValue())
                                .totalInvested(portfolio.getTotalInvested())
                                .profitPercentage(portfolio.getProfitPercentage())
                                .profitAccrualStatus(portfolio.getProfitAccrualStatus())
                                .availableProfit(portfolio.getAvailableProfit())
                                .totalProfitEarned(portfolio.getTotalProfitEarned())
                                .updatedAt(portfolio.getUpdatedAt())
                                .profitMode(portfolio.getProfitMode())
                                .profitModeEffectiveDate(portfolio.getProfitModeEffectiveDate())
                                .isProrationEnabled(portfolio.getIsProrationEnabled())
                                .allowEarlyExit(portfolio.getAllowEarlyExit())
                                .nextEstimatedPayout(calculateNextEstimatedPayout(portfolio))
                                .build();

                System.out.println("DEBUG: Calculating Payout for " + email);
                System.out.println("DEBUG: Profit Mode: " + portfolio.getProfitMode());
                System.out.println("DEBUG: Invested: " + portfolio.getTotalInvested());
                System.out.println("DEBUG: Total Value: " + portfolio.getTotalValue());
                System.out.println("DEBUG: Percentage: " + portfolio.getProfitPercentage());
                System.out.println("DEBUG: Result: " + portfolioDTO.getNextEstimatedPayout());

                return portfolioDTO;
        }

        private BigDecimal calculateNextEstimatedPayout(Portfolio portfolio) {
                if (portfolio.getProfitPercentage() == null) {
                        System.out.println("DEBUG: Profit percentage is null, returning ZERO");
                        return BigDecimal.ZERO;
                }

                // For COMPOUNDING mode, calculate based on totalValue (invested + accumulated
                // profit)
                // For FIXED mode, calculate based on totalInvested (only initial investment)
                BigDecimal baseAmount;
                String mode = portfolio.getProfitMode() != null ? portfolio.getProfitMode().toString() : "NULL";

                if (portfolio.getProfitMode() == com.enterprise.investmentanalytics.model.enums.ProfitMode.COMPOUNDING) {
                        baseAmount = portfolio.getTotalValue() != null ? portfolio.getTotalValue() : BigDecimal.ZERO;
                        System.out.println("DEBUG: COMPOUNDING mode - using totalValue: " + baseAmount);
                } else {
                        baseAmount = portfolio.getTotalInvested() != null ? portfolio.getTotalInvested()
                                        : BigDecimal.ZERO;
                        System.out.println("DEBUG: FIXED mode - using totalInvested: " + baseAmount);
                }

                BigDecimal result = baseAmount.multiply(portfolio.getProfitPercentage())
                                .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);

                System.out.println("DEBUG: Mode=" + mode + ", Base=" + baseAmount + ", Rate="
                                + portfolio.getProfitPercentage() + "%, Result=" + result);

                return result;
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
                                .profitMode(com.enterprise.investmentanalytics.model.enums.ProfitMode.FIXED)
                                .isProrationEnabled(true)
                                .allowEarlyExit(false)
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

                return new java.util.ArrayList<>();
        }

        @org.springframework.transaction.annotation.Transactional
        public void updateProfitConfig(java.util.UUID clientId,
                        com.enterprise.investmentanalytics.dto.request.PortfolioConfigDTO config) {
                Portfolio portfolio = portfolioRepository.findByUserId(clientId)
                                .orElseThrow(() -> new RuntimeException("Portfolio not found for client: " + clientId));

                if (config.getProfitMode() != null) {
                        portfolio.setProfitMode(config.getProfitMode());
                        portfolio.setProfitModeEffectiveDate(java.time.LocalDate.now());

                        // Automatically set the correct profit percentage based on mode
                        // FIXED: 4% monthly (48% annual)
                        // COMPOUNDING: ~3.6% monthly (52% annual through compounding)
                        if (config.getProfitMode() == com.enterprise.investmentanalytics.model.enums.ProfitMode.COMPOUNDING) {
                                BigDecimal compoundingRate = globalConfigService.getBigDecimal(
                                                com.enterprise.investmentanalytics.service.GlobalConfigService.COMPOUNDING_MONTHLY_RATE_PERCENT);
                                portfolio.setProfitPercentage(compoundingRate);
                                System.out.println("DEBUG: Set COMPOUNDING rate to " + compoundingRate + "%");
                        } else {
                                BigDecimal fixedRate = globalConfigService.getBigDecimal(
                                                com.enterprise.investmentanalytics.service.GlobalConfigService.FIXED_MONTHLY_RATE_PERCENT);
                                portfolio.setProfitPercentage(fixedRate);
                                System.out.println("DEBUG: Set FIXED rate to " + fixedRate + "%");
                        }
                }

                if (config.getProfitPercentage() != null) {
                        portfolio.setProfitPercentage(config.getProfitPercentage());
                }

                if (config.getIsProrationEnabled() != null) {
                        portfolio.setIsProrationEnabled(config.getIsProrationEnabled());
                }

                if (config.getAllowEarlyExit() != null) {
                        portfolio.setAllowEarlyExit(config.getAllowEarlyExit());
                }

                portfolioRepository.save(portfolio);
        }
}
