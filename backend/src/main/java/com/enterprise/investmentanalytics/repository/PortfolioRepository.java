package com.enterprise.investmentanalytics.repository;

import com.enterprise.investmentanalytics.model.entity.Portfolio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PortfolioRepository extends JpaRepository<Portfolio, UUID> {
    @org.springframework.data.jpa.repository.Query("SELECT p FROM Portfolio p JOIN FETCH p.user u LEFT JOIN FETCH u.mediator WHERE u.id = :userId")
    Optional<Portfolio> findByUserId(@org.springframework.data.repository.query.Param("userId") UUID userId);

    @org.springframework.data.jpa.repository.Query("SELECT p FROM Portfolio p JOIN FETCH p.user u LEFT JOIN FETCH u.mediator WHERE u.email = :email")
    Optional<Portfolio> findByUserEmail(@org.springframework.data.repository.query.Param("email") String email);

    @org.springframework.data.jpa.repository.Query("SELECT p FROM Portfolio p JOIN FETCH p.user u LEFT JOIN FETCH u.mediator WHERE u.mediator.id = :mediatorId")
    java.util.List<Portfolio> findByUserMediatorId(
            @org.springframework.data.repository.query.Param("mediatorId") UUID mediatorId);

    @org.springframework.data.jpa.repository.Query("SELECT p FROM Portfolio p JOIN FETCH p.user u LEFT JOIN FETCH u.mediator")
    java.util.List<Portfolio> findAllWithDetails();
}
