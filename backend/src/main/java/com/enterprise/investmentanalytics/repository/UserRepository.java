package com.enterprise.investmentanalytics.repository;

import com.enterprise.investmentanalytics.model.entity.User;
import com.enterprise.investmentanalytics.model.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findByRole(Role role);

    // UserId methods
    Optional<User> findByUserId(String userId);

    boolean existsByUserId(String userId);

    Optional<User> findTopByOrderBySequentialIdDesc();

    Optional<User> findTopByUserIdStartingWithOrderByUserIdDesc(String prefix);
}
