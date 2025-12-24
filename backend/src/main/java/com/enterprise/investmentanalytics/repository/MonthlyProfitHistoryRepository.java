package com.enterprise.investmentanalytics.repository;

import com.enterprise.investmentanalytics.model.entity.MonthlyProfitHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MonthlyProfitHistoryRepository extends JpaRepository<MonthlyProfitHistory, UUID> {

    boolean existsByUserIdAndMonthAndYear(UUID userId, int month, int year);

    List<MonthlyProfitHistory> findByUserIdOrderByYearDescMonthDesc(UUID userId);

    Page<MonthlyProfitHistory> findByUserIdOrderByYearDescMonthDesc(UUID userId, Pageable pageable);

    Optional<MonthlyProfitHistory> findByUserIdAndMonthAndYear(UUID userId, int month, int year);
}
