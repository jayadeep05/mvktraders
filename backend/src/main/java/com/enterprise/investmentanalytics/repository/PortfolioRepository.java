package com.enterprise.investmentanalytics.repository;

import com.enterprise.investmentanalytics.model.entity.Portfolio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PortfolioRepository extends JpaRepository<Portfolio, UUID> {
    Optional<Portfolio> findByUserId(UUID userId);

    Optional<Portfolio> findByUserEmail(String email);
}
